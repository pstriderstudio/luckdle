/**
 * EngineStore over Postgres (the schema in supabase/migrations). Written
 * against a tiny SQL client interface so it runs with postgres.js in the
 * Edge Function and with PGlite in tests.
 */
import { type GameId, isGameId } from '../catalog.ts';
import type { OwnedItem } from './rules.ts';
import type { DayTx, EngineStore, StoredResult } from './store.ts';

export interface SqlClient {
  /** Runs a parameterised query ($1, $2, …) and returns its rows. */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs `fn` inside one transaction. */
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
}

interface ResultRow {
  game_day: string;
  game_id: string;
  outcome: unknown;
  progress: unknown;
  completed: boolean;
  score: number | null;
  label: string | null;
  created_at: string;
}

const RESULT_COLUMNS = `game_day::text as game_day, game_id, outcome, progress, completed,
  score::float8 as score, label, created_at::text as created_at`;

/**
 * jsonb values may come back parsed or as text depending on the driver.
 * jsonb parameters are always sent as JSON text and cast (`$n::text::jsonb`)
 * so drivers that encode json-typed parameters themselves don't double-encode.
 */
const json = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);

function toResult(row: ResultRow): StoredResult {
  return {
    gameDay: row.game_day,
    gameId: row.game_id as GameId,
    outcome: json(row.outcome),
    progress: (json(row.progress) ?? {}) as StoredResult['progress'],
    completed: row.completed,
    score: row.score,
    label: row.label,
    createdAt: row.created_at,
  };
}

const UPDATABLE: Record<string, string> = {
  outcome: 'outcome',
  progress: 'progress',
  completed: 'completed',
  score: 'score',
  label: 'label',
};

export class SqlStore implements EngineStore {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async ensurePlayer(playerId: string) {
    await this.db.query('insert into public.players (id) values ($1) on conflict (id) do nothing', [playerId]);
  }

  withDay<T>(playerId: string, gameDay: string, fn: (day: DayTx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Serialise requests for the same player and game day.
      await tx.query(`select pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text))`, [playerId, gameDay]);
      const day: DayTx = {
        async getBoard() {
          const rows = await tx.query<{ games: string[] }>(
            'select games from public.daily_boards where player_id = $1 and game_day = $2::date',
            [playerId, gameDay],
          );
          return rows.length ? rows[0].games.filter(isGameId) : null;
        },
        async latestBoardBefore() {
          const rows = await tx.query<{ games: string[] }>(
            `select games from public.daily_boards where player_id = $1 and game_day < $2::date
             order by game_day desc limit 1`,
            [playerId, gameDay],
          );
          return rows.length ? rows[0].games.filter(isGameId) : null;
        },
        async setBoard(games: GameId[]) {
          await tx.query(
            `insert into public.daily_boards (player_id, game_day, games)
             values ($1, $2::date, array(select jsonb_array_elements_text($3::text::jsonb)))
             on conflict (player_id, game_day) do update set games = excluded.games, updated_at = now()`,
            [playerId, gameDay, JSON.stringify(games)],
          );
        },
        async results() {
          const rows = await tx.query<ResultRow>(
            `select ${RESULT_COLUMNS} from public.game_results where player_id = $1 and game_day = $2::date order by created_at`,
            [playerId, gameDay],
          );
          return rows.map(toResult);
        },
        async insertResult(result: StoredResult, items: OwnedItem[]) {
          const rows = await tx.query<{ id: string }>(
            `insert into public.game_results (player_id, game_day, game_id, outcome, progress, created_at)
             values ($1, $2::date, $3, $4::text::jsonb, $5::text::jsonb, $6::timestamptz)
             on conflict (player_id, game_day, game_id) do nothing
             returning id`,
            [playerId, gameDay, result.gameId, JSON.stringify(result.outcome), JSON.stringify(result.progress), result.createdAt],
          );
          if (rows.length === 0) return false;
          if (items.length > 0) {
            await tx.query(
              `insert into public.result_items (result_id, player_id, item_type, item_id, tier, game_day, details)
               select $1, $2, i->>'type', i->>'itemId', i->>'tier', $3::date, coalesce(i->'details', '{}'::jsonb)
               from jsonb_array_elements($4::text::jsonb) as i
               on conflict do nothing`,
              [rows[0].id, playerId, gameDay, JSON.stringify(items)],
            );
          }
          return true;
        },
        async updateResult(gameId, patch) {
          const sets: string[] = [];
          const params: unknown[] = [playerId, gameDay, gameId];
          for (const [key, value] of Object.entries(patch)) {
            const column = UPDATABLE[key];
            if (!column) continue;
            params.push(key === 'outcome' || key === 'progress' ? JSON.stringify(value) : value);
            const cast = key === 'outcome' || key === 'progress' ? '::text::jsonb' : key === 'score' ? '::numeric' : '';
            sets.push(`${column} = $${params.length}${cast}`);
            if (key === 'completed' && value) sets.push('completed_at = now()');
          }
          if (sets.length === 0) return;
          await tx.query(
            `update public.game_results set ${sets.join(', ')}
             where player_id = $1 and game_day = $2::date and game_id = $3`,
            params,
          );
        },
        async cohortScores() {
          const rows = await tx.query<{ s: number }>(
            'select daily_score::float8 as s from public.daily_scores where game_day = $1::date and player_id <> $2',
            [gameDay, playerId],
          );
          return rows.map((r) => r.s);
        },
        async saveDailyScore(score: number, percentile: number) {
          await tx.query(
            `insert into public.daily_scores (player_id, game_day, daily_score, percentile)
             values ($1, $2::date, $3, $4)
             on conflict (player_id, game_day) do update
               set daily_score = excluded.daily_score, percentile = excluded.percentile
               where public.daily_scores.finalized_at is null`,
            [playerId, gameDay, score, percentile],
          );
        },
      };
      return fn(day);
    });
  }

  async allResults(playerId: string) {
    const rows = await this.db.query<ResultRow>(
      `select ${RESULT_COLUMNS} from public.game_results where player_id = $1 order by game_day, created_at`,
      [playerId],
    );
    return rows.map(toResult);
  }

  async viewedItems(playerId: string) {
    const rows = await this.db.query<{ key: string }>(
      `select item_type || ':' || item_id as key from public.item_views where player_id = $1`,
      [playerId],
    );
    return new Set(rows.map((r) => r.key));
  }

  async markViewed(playerId: string, keys: string[]) {
    if (keys.length === 0) return;
    await this.db.query(
      `insert into public.item_views (player_id, item_type, item_id)
       select $1, split_part(k, ':', 1), split_part(k, ':', 2) from jsonb_array_elements_text($2::text::jsonb) as k
       on conflict do nothing`,
      [playerId, JSON.stringify(keys)],
    );
  }

  async cohortScores(gameDay: string, excludePlayer: string) {
    const rows = await this.db.query<{ s: number }>(
      'select daily_score::float8 as s from public.daily_scores where game_day = $1::date and player_id <> $2',
      [gameDay, excludePlayer],
    );
    return rows.map((r) => r.s);
  }
}
