-- Luckdle initial schema (see docs/adr/0001-tech-stack.md).
--
-- Rules enforced here:
--   * Official results are written only by Edge Functions (service role).
--     Players can read their own rows and never write results.
--   * One official result per (player, game day, game).
--   * Hidden outcome data (chest contents before the pick, the Lucky Number
--     secret, unrevealed cards) lives in game_results.outcome, which players
--     cannot select; they see only game_results.revealed.
--   * Collections are derived from saved results (result_items), not a
--     separately awarded list.
--   * A game day is the date whose 3:00 AM America/New_York reset starts it;
--     it is computed on the server.

-- ---------------------------------------------------------------------------
-- Helpers

create function public.luckdle_game_day(at timestamptz default now())
returns date
language sql
stable
as $$
  select ((at at time zone 'America/New_York') - interval '3 hours')::date
$$;

-- ---------------------------------------------------------------------------
-- Players: one per Supabase auth user (anonymous on first visit, linkable later).

create table public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 32),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Games

create table public.games (
  id text primary key,
  board text not null check (board in ('arena', 'vault', 'wilds', 'night-sky')),
  name text not null
);

insert into public.games (id, board, name) values
  ('lucky-number', 'arena', 'Lucky Number'),
  ('coin-streak', 'arena', 'Coin Streak'),
  ('dice-of-destiny', 'arena', 'Dice of Destiny'),
  ('mystery-card-pack', 'vault', 'Mystery Card Pack'),
  ('daily-summon', 'vault', 'Daily Summon'),
  ('three-chests', 'vault', 'Three Chests'),
  ('lucky-fishing', 'wilds', 'Lucky Fishing'),
  ('gem-breaker', 'wilds', 'Gem Breaker'),
  ('garden-of-chance', 'wilds', 'Garden of Chance'),
  ('falling-star', 'night-sky', 'Falling Star'),
  ('cosmic-alignment', 'night-sky', 'Cosmic Alignment'),
  ('wishing-well', 'night-sky', 'The Wishing Well');

-- ---------------------------------------------------------------------------
-- Personal daily board: up to five picks per game day.

create table public.board_slots (
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  game_id text not null references public.games (id),
  position smallint not null check (position between 0 and 4),
  primary key (player_id, game_day, game_id),
  unique (player_id, game_day, position) deferrable initially deferred
);

-- ---------------------------------------------------------------------------
-- Official results. The row is created (and the outcome saved) before any
-- animation; the game is locked from that moment.

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  game_id text not null references public.games (id),
  -- Full server-side outcome. Never exposed to players directly.
  outcome jsonb not null,
  -- What the player has been shown so far, and where to resume.
  revealed jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  -- Set when the result is final (e.g. after the chest pick or the solving guess).
  score numeric(9, 6) check (score between 0 and 100),
  label text check (label in ('Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_id, game_day, game_id)
);

create index game_results_day_idx on public.game_results (game_day, game_id);

-- Items contained in a result (cards, characters, catches, curios, gems,
-- plants). Duplicates within one result add nothing.
create table public.result_items (
  result_id uuid not null references public.game_results (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  item_type text not null check (item_type in ('card', 'character', 'fish', 'curio', 'gem', 'plant')),
  item_id text not null,
  tier text not null,
  game_day date not null,
  details jsonb not null default '{}'::jsonb, -- e.g. length, carats, purity, mutations (personal bests)
  primary key (result_id, item_type, item_id)
);

create index result_items_owner_idx on public.result_items (player_id, item_type, item_id);

-- Ownership, derived from saved results.
create view public.collection
with (security_invoker = true)
as
select player_id, item_type, item_id, tier, min(game_day) as first_game_day
from public.result_items
group by player_id, item_type, item_id, tier;

-- “New” marker: an item is new until the player has viewed it.
create table public.item_views (
  player_id uuid not null references public.players (id) on delete cascade,
  item_type text not null,
  item_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (player_id, item_type, item_id)
);

-- ---------------------------------------------------------------------------
-- Daily scores: written when a player finishes all five games; the
-- percentile is finalised at the 3 AM reset.

create table public.daily_scores (
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  daily_score numeric(9, 6) not null check (daily_score between 0 and 100),
  final_percentile numeric(9, 6),
  final_label text check (final_label in ('Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (player_id, game_day)
);

create index daily_scores_day_idx on public.daily_scores (game_day, daily_score);

-- Top 100 daily scores for a game day, signed-in players only. Equal scores
-- share a place.
create function public.leaderboard(day date)
returns table (place bigint, display_name text, daily_score numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by d.daily_score desc) as place,
         p.display_name,
         d.daily_score
  from public.daily_scores d
  join public.players p on p.id = d.player_id
  join auth.users u on u.id = d.player_id
  where d.game_day = day
    and not coalesce(u.is_anonymous, false)
    and p.display_name is not null
  order by d.daily_score desc
  limit 100
$$;

-- ---------------------------------------------------------------------------
-- Row-level security: players read only their own rows. All game writes go
-- through Edge Functions using the service role, which bypasses RLS.

alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.board_slots enable row level security;
alter table public.game_results enable row level security;
alter table public.result_items enable row level security;
alter table public.item_views enable row level security;
alter table public.daily_scores enable row level security;

create policy "games are public" on public.games for select using (true);
create policy "read own player" on public.players for select using (id = auth.uid());
create policy "read own board" on public.board_slots for select using (player_id = auth.uid());
create policy "read own results" on public.game_results for select using (player_id = auth.uid());
create policy "read own items" on public.result_items for select using (player_id = auth.uid());
create policy "read own views" on public.item_views for select using (player_id = auth.uid());
create policy "mark own items viewed" on public.item_views for insert with check (player_id = auth.uid());
create policy "read own daily scores" on public.daily_scores for select using (player_id = auth.uid());

-- Column privileges: the hidden outcome is never readable by players.
revoke all on public.game_results from anon, authenticated;
grant select (id, player_id, game_day, game_id, revealed, progress, score, label, completed_at, created_at)
  on public.game_results to authenticated;

revoke insert, update, delete on public.players, public.board_slots, public.result_items, public.daily_scores
  from anon, authenticated;
revoke all on public.item_views from anon;
revoke update, delete on public.item_views from authenticated;

revoke all on function public.leaderboard(date) from public;
grant execute on function public.leaderboard(date) to anon, authenticated;
