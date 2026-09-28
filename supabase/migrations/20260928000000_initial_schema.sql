-- Luckdle initial schema (see docs/adr/0001-tech-stack.md).
--
-- Rules enforced here:
--   * Official results are written only by the `game` Edge Function, which
--     connects as the database owner. Players can read their own rows and
--     never write results.
--   * One official result per (player, game day, game).
--   * Hidden outcome data (chest contents before the pick, the Lucky Number
--     secret, the coin run, unrevealed cards) lives in game_results.outcome,
--     which players cannot select.
--   * Collections are derived from saved results (result_items), not a
--     separately awarded list.
--   * A game day is the date whose 3:00 AM America/New_York reset starts it.

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
  ('wishing-well', 'night-sky', 'The Wishing Well');

-- ---------------------------------------------------------------------------
-- Personal daily board: up to five picks per game day, in display order.
-- A row exists once the day's board has been created (possibly empty), so a
-- cleared board is not carried over again.

create table public.daily_boards (
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  games text[] not null default '{}' check (cardinality(games) <= 5),
  updated_at timestamptz not null default now(),
  primary key (player_id, game_day)
);

-- ---------------------------------------------------------------------------
-- Official results. The row (with the full outcome) is created before any
-- animation; the game is locked from that moment.

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  game_id text not null references public.games (id),
  -- Full server-side outcome. Never exposed to players directly.
  outcome jsonb not null,
  -- Client reveal position, so leaving and returning resumes at the same point.
  progress jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
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
-- Daily scores: written when a player finishes all five games, with the
-- live percentile at that moment; final_percentile / final_label are set
-- after the 3 AM reset by finalize_game_days().

create table public.daily_scores (
  player_id uuid not null references public.players (id) on delete cascade,
  game_day date not null,
  daily_score numeric(9, 6) not null check (daily_score between 0 and 100),
  percentile numeric(9, 6) not null check (percentile between 0 and 100),
  final_percentile numeric(9, 6),
  final_label text check (final_label in ('Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (player_id, game_day)
);

create index daily_scores_day_idx on public.daily_scores (game_day, daily_score);

-- Finalises every finished game day that has unfinalised scores. With at
-- least 20 finishers the percentile is against the real cohort (other
-- players scoring lower, plus half of ties); otherwise the live percentile
-- against the simulated field stands. Returns the number of rows finalised.
create function public.finalize_game_days()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  finalized integer;
begin
  with pending_days as (
    select distinct game_day
    from public.daily_scores
    where finalized_at is null and game_day < public.luckdle_game_day(now())
  ),
  ranked as (
    select d.player_id,
           d.game_day,
           d.percentile,
           count(*) over (partition by d.game_day) as cohort,
           rank() over (partition by d.game_day order by d.daily_score) - 1 as lower,
           count(*) over (partition by d.game_day, d.daily_score) - 1 as ties
    from public.daily_scores d
    join pending_days p on p.game_day = d.game_day
  ),
  computed as (
    select player_id,
           game_day,
           case when cohort >= 20 then 100.0 * (lower + ties / 2.0) / (cohort - 1) else percentile end as pct
    from ranked
  )
  update public.daily_scores s
     set final_percentile = c.pct,
         final_label = (array['Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed'])[least(5, floor(c.pct / 20)::int + 1)],
         finalized_at = now()
    from computed c
   where s.player_id = c.player_id and s.game_day = c.game_day and s.finalized_at is null;
  get diagnostics finalized = row_count;
  return finalized;
end;
$$;

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
-- Row-level security: players read only their own rows (defence in depth —
-- the web app goes through the Edge Function). Writes go through the
-- function's owner connection, which bypasses RLS.

alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.daily_boards enable row level security;
alter table public.game_results enable row level security;
alter table public.result_items enable row level security;
alter table public.item_views enable row level security;
alter table public.daily_scores enable row level security;

create policy "games are public" on public.games for select using (true);
create policy "read own player" on public.players for select using (id = auth.uid());
create policy "read own board" on public.daily_boards for select using (player_id = auth.uid());
create policy "read own results" on public.game_results for select using (player_id = auth.uid());
create policy "read own items" on public.result_items for select using (player_id = auth.uid());
create policy "read own views" on public.item_views for select using (player_id = auth.uid());
create policy "read own daily scores" on public.daily_scores for select using (player_id = auth.uid());

-- Column privileges: the hidden outcome is never readable by players.
revoke all on public.game_results from anon, authenticated;
grant select (id, player_id, game_day, game_id, progress, completed, score, label, completed_at, created_at)
  on public.game_results to authenticated;

revoke insert, update, delete on public.players, public.daily_boards, public.result_items, public.item_views, public.daily_scores
  from anon, authenticated;

revoke all on function public.finalize_game_days() from public, anon, authenticated;
revoke all on function public.leaderboard(date) from public;
grant execute on function public.leaderboard(date) to anon, authenticated;
