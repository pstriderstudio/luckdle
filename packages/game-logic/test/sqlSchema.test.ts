import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine } from '../src/engine/engine.ts';
import { SqlStore } from '../src/engine/sqlStore.ts';
import { seededRng } from '../src/rng.ts';
import { closeAllPostgres, startPostgres, uuid } from './pgHarness.ts';

afterEach(closeAllPostgres);

const DAY = '2026-09-28';
const NOW = new Date('2026-09-28T12:00:00Z');

describe('Postgres schema', () => {
  it('hides outcomes from players and limits them to their own rows', async () => {
    const pg = await startPostgres();
    const [me, other] = [uuid(1), uuid(2)];
    await pg.addUsers([me, other]);
    const engine = new GameEngine(new SqlStore(pg.client), seededRng(1));
    await engine.handle({ playerId: me, gameDay: DAY, now: NOW }, { op: 'start', game: 'three-chests' });
    await engine.handle({ playerId: other, gameDay: DAY, now: NOW }, { op: 'start', game: 'dice-of-destiny' });

    await pg.db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${me}', false);`);
    const visible = await pg.db.query<{ game_id: string }>('select game_id from public.game_results');
    expect(visible.rows.map((r) => r.game_id)).toEqual(['three-chests']);
    await expect(pg.db.query('select outcome from public.game_results')).rejects.toThrow(/permission denied/);
    await expect(
      pg.db.query(`insert into public.game_results (player_id, game_day, game_id, outcome) values ($1, $2, 'coin-streak', '{}')`, [me, DAY]),
    ).rejects.toThrow(/permission denied/);
    await expect(pg.db.query('update public.daily_boards set games = $1', [['dice-of-destiny']])).rejects.toThrow(/permission denied/);
    await pg.db.exec('reset role');
  });

  it('records collectibles per result and derives the collection view', async () => {
    const pg = await startPostgres();
    const me = uuid(1);
    await pg.addUsers([me]);
    const engine = new GameEngine(new SqlStore(pg.client), seededRng(2));
    await engine.handle({ playerId: me, gameDay: DAY, now: NOW }, { op: 'start', game: 'mystery-card-pack' });
    const items = await pg.db.query<{ n: number }>("select count(*)::int as n from public.result_items where item_type = 'card'");
    const owned = await pg.db.query<{ n: number }>('select count(*)::int as n from public.collection');
    expect(items.rows[0].n).toBeGreaterThan(0);
    expect(owned.rows[0].n).toBe(items.rows[0].n);
  });

  it('rejects boards with more than five games', async () => {
    const pg = await startPostgres();
    const me = uuid(1);
    await pg.addUsers([me]);
    await pg.db.query('insert into public.players (id) values ($1)', [me]);
    await expect(
      pg.db.query('insert into public.daily_boards (player_id, game_day, games) values ($1, $2, $3)', [
        me,
        DAY,
        ['a', 'b', 'c', 'd', 'e', 'f'],
      ]),
    ).rejects.toThrow(/check/);
  });

  it('computes the game day with the 3 AM Eastern reset', async () => {
    const pg = await startPostgres();
    const q = async (at: string) =>
      (await pg.db.query<{ d: string }>('select public.luckdle_game_day($1::timestamptz)::text as d', [at])).rows[0].d;
    expect(await q('2026-09-28T06:59:00Z')).toBe('2026-09-27');
    expect(await q('2026-09-28T07:00:00Z')).toBe('2026-09-28');
    expect(await q('2026-12-01T07:59:00Z')).toBe('2026-11-30');
    expect(await q('2026-12-01T08:00:00Z')).toBe('2026-12-01');
  });

  it('finalises past game days against the real cohort (20+) or keeps the simulated percentile', async () => {
    const pg = await startPostgres();
    const big = '2020-01-01';
    const small = '2020-01-02';
    for (let i = 0; i < 25; i++) {
      const id = uuid(10 + i);
      await pg.addUsers([id]);
      await pg.db.query('insert into public.players (id) values ($1)', [id]);
      // Scores 0, 4, 8, … 96: player i is above exactly i others.
      await pg.db.query('insert into public.daily_scores (player_id, game_day, daily_score, percentile) values ($1, $2, $3, 50)', [id, big, i * 4]);
      if (i < 5) {
        await pg.db.query('insert into public.daily_scores (player_id, game_day, daily_score, percentile) values ($1, $2, $3, 33)', [id, small, i]);
      }
    }
    const today = uuid(99);
    await pg.addUsers([today]);
    await pg.db.query('insert into public.players (id) values ($1)', [today]);
    await pg.db.query(
      'insert into public.daily_scores (player_id, game_day, daily_score, percentile) values ($1, public.luckdle_game_day(now()), 50, 50)',
      [today],
    );

    const n = await pg.db.query<{ n: number }>('select public.finalize_game_days() as n');
    expect(n.rows[0].n).toBe(30);
    const rows = await pg.db.query<{ game_day: string; s: number; p: number; l: string }>(
      `select game_day::text, daily_score::float8 as s, final_percentile::float8 as p, final_label as l
       from public.daily_scores where finalized_at is not null order by game_day, daily_score`,
    );
    const bigRows = rows.rows.filter((r) => r.game_day === big);
    bigRows.forEach((r, i) => expect(r.p).toBeCloseTo((100 * i) / 24, 6));
    expect(bigRows[0].l).toBe('Jinxed');
    expect(bigRows[24].l).toBe('Charmed');
    const smallRows = rows.rows.filter((r) => r.game_day === small);
    expect(smallRows.every((r) => Math.abs(r.p - 33) < 1e-9)).toBe(true);
    // Today's scores are not finalised yet.
    const open = await pg.db.query<{ n: number }>('select count(*)::int as n from public.daily_scores where finalized_at is null');
    expect(open.rows[0].n).toBe(1);
  });

  it('shows only signed-in players with a display name on the leaderboard', async () => {
    const pg = await startPostgres();
    const [named, anonymous] = [uuid(1), uuid(2)];
    await pg.addUsers([named], false);
    await pg.addUsers([anonymous], true);
    for (const [id, name] of [
      [named, 'Ceasar'],
      [anonymous, 'Ghost'],
    ]) {
      await pg.db.query('insert into public.players (id, display_name) values ($1, $2)', [id, name]);
      await pg.db.query('insert into public.daily_scores (player_id, game_day, daily_score, percentile) values ($1, $2, 70, 50)', [id, DAY]);
    }
    const board = await pg.db.query<{ display_name: string }>('select display_name from public.leaderboard($1::date)', [DAY]);
    expect(board.rows.map((r) => r.display_name)).toEqual(['Ceasar']);
  });
});
