import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine, GameError, validateRequest } from '../src/engine/engine.ts';
import { MemoryStore } from '../src/engine/memoryStore.ts';
import { SqlStore } from '../src/engine/sqlStore.ts';
import type { EngineStore } from '../src/engine/store.ts';
import type { ServiceResponse } from '../src/engine/api.ts';
import { seededRng } from '../src/rng.ts';
import { GAMES_PER_DAY } from '../src/daily.ts';
import { closeAllPostgres, startPostgres, uuid } from './pgHarness.ts';

afterEach(closeAllPostgres);

const DAY = '2026-09-28';
const NOW = new Date('2026-09-28T12:00:00Z');
const P1 = uuid(1);
const A = uuid(2);
const B = uuid(3);
const ctx = (playerId = P1, gameDay = DAY) => ({ playerId, gameDay, now: NOW });

interface Harness {
  store: EngineStore;
  dailyScore(playerId: string, gameDay: string): Promise<number | undefined>;
  seedCohort(gameDay: string, scores: number[]): Promise<void>;
}

const HARNESSES: [string, () => Promise<Harness>][] = [
  [
    'memory',
    async () => {
      const store = new MemoryStore();
      return {
        store,
        dailyScore: async (p, d) => store.state.daily[d]?.[p]?.score,
        seedCohort: async (d, scores) => {
          store.state.daily[d] = Object.fromEntries(scores.map((score, i) => [uuid(100 + i), { score, percentile: 0 }]));
        },
      };
    },
  ],
  [
    'postgres',
    async () => {
      const pg = await startPostgres();
      await pg.addUsers([P1, A, B]);
      return {
        store: new SqlStore(pg.client),
        dailyScore: async (p, d) => {
          const rows = await pg.client.query<{ s: number }>(
            'select daily_score::float8 as s from public.daily_scores where player_id = $1 and game_day = $2::date',
            [p, d],
          );
          return rows[0]?.s;
        },
        seedCohort: async (d, scores) => {
          for (const [i, score] of scores.entries()) {
            const id = uuid(100 + i);
            await pg.addUsers([id]);
            await pg.client.query('insert into public.players (id) values ($1)', [id]);
            await pg.client.query(
              'insert into public.daily_scores (player_id, game_day, daily_score, percentile) values ($1, $2::date, $3, 0)',
              [id, d, score],
            );
          }
        },
      };
    },
  ],
];
const FIVE = ['dice-of-destiny', 'falling-star', 'three-chests', 'lucky-number', 'coin-streak'] as const;

/** Plays every started-but-unresolved game to the end using only what the player can see. */
async function resolveAll(engine: GameEngine, c = ctx()): Promise<ServiceResponse> {
  let r = await engine.handle(c, { op: 'snapshot' });
  for (const [game, s] of Object.entries(r.snapshot.sessions)) {
    const view = s!.view;
    if (view.game === 'three-chests' && view.pick === null) {
      r = await engine.handle(c, { op: 'act', game, action: { type: 'pick', chest: 0 } });
    }
    if (view.game === 'coin-streak') {
      while (!(r.snapshot.sessions['coin-streak']!.view as { over: boolean }).over) {
        r = await engine.handle(c, { op: 'act', game, action: { type: 'flip', call: 'tails' } });
      }
    }
    if (view.game === 'lucky-number') {
      let lo = view.digits === 1 ? 0 : 10 ** (view.digits - 1);
      let hi = 10 ** view.digits - 1;
      for (;;) {
        const g = Math.floor((lo + hi) / 2);
        r = await engine.handle(c, { op: 'act', game, action: { type: 'guess', value: g } });
        const f = (r.session!.view as { guesses: { feedback: string }[] }).guesses.at(-1)!.feedback;
        if (f === 'correct') break;
        if (f === 'higher') lo = g + 1;
        else hi = g - 1;
      }
    }
  }
  return r;
}

async function playFive(engine: GameEngine, c = ctx()) {
  for (const game of FIVE) await engine.handle(c, { op: 'start', game });
  await resolveAll(engine, c);
  let r: ServiceResponse | undefined;
  for (const game of FIVE) r = await engine.handle(c, { op: 'finish', game });
  return r!;
}

describe.each(HARNESSES)('game engine (%s store)', (_name, makeHarness) => {
  it('starts with an empty board and adds games when they are played', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(1));
    let r = await engine.handle(ctx(), { op: 'snapshot' });
    expect(r.snapshot.board).toEqual([]);
    r = await engine.handle(ctx(), { op: 'start', game: 'dice-of-destiny' });
    expect(r.snapshot.board).toEqual([{ game: 'dice-of-destiny', played: true }]);
    expect(r.session?.gameId).toBe('dice-of-destiny');
  });

  it('keeps one official result per game per day', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(2));
    const a = await engine.handle(ctx(), { op: 'start', game: 'dice-of-destiny' });
    const b = await engine.handle(ctx(), { op: 'start', game: 'dice-of-destiny' });
    expect(b.session?.view).toEqual(a.session?.view);
  });

  it('enforces five picks, locks played games, and allows swapping unplayed picks', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(3));
    for (const game of FIVE.slice(0, 4)) await engine.handle(ctx(), { op: 'addPick', game });
    await engine.handle(ctx(), { op: 'start', game: 'coin-streak' });
    await expect(engine.handle(ctx(), { op: 'start', game: 'gem-breaker' })).rejects.toThrow(GameError);
    await expect(engine.handle(ctx(), { op: 'removePick', game: 'coin-streak' })).rejects.toThrow('locked');
    const r = await engine.handle(ctx(), { op: 'swapPick', out: 'dice-of-destiny', into: 'gem-breaker' });
    expect(r.snapshot.board.map((s) => s.game)).toContain('gem-breaker');
    expect(r.snapshot.board[0].game).toBe('gem-breaker');
  });

  it('never exposes unrevealed outcomes', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(4));
    const chests = await engine.handle(ctx(), { op: 'start', game: 'three-chests' });
    expect(chests.session?.view).toEqual({ game: 'three-chests', pick: null, chests: [null, null, null] });
    const number = await engine.handle(ctx(), { op: 'start', game: 'lucky-number' });
    const json = JSON.stringify(number);
    expect(json).not.toContain('secret');
    const coin = await engine.handle(ctx(), { op: 'start', game: 'coin-streak' });
    expect(JSON.stringify(coin)).not.toContain('hits');
    expect(chests.session?.result).toBeNull();
  });

  it('refuses to finish unresolved games and scores finished ones', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(5));
    await engine.handle(ctx(), { op: 'start', game: 'three-chests' });
    await expect(engine.handle(ctx(), { op: 'finish', game: 'three-chests' })).rejects.toThrow('not finished');
    await engine.handle(ctx(), { op: 'act', game: 'three-chests', action: { type: 'pick', chest: 2 } });
    const r = await engine.handle(ctx(), { op: 'finish', game: 'three-chests' });
    expect(r.session?.completed).toBe(true);
    expect(r.session?.result?.score).toBeGreaterThan(0);
    await expect(engine.handle(ctx(), { op: 'act', game: 'three-chests', action: { type: 'pick', chest: 0 } })).rejects.toThrow();
  });

  it('builds the daily report, saves the daily score, and carries the board over', async () => {
    const h = await makeHarness();
    const engine = new GameEngine(h.store, seededRng(6));
    const r = await playFive(engine);
    expect(r.snapshot.report?.rows).toHaveLength(GAMES_PER_DAY);
    expect(r.snapshot.report?.simulatedField).toBe(true);
    expect(await h.dailyScore(P1, DAY)).toBeCloseTo(r.snapshot.report!.dailyScore, 5);
    const next = await engine.handle(ctx(P1, '2026-09-29'), { op: 'snapshot' });
    expect(next.snapshot.board.map((s) => s.game)).toEqual([...FIVE]);
    expect(next.snapshot.board.every((s) => !s.played)).toBe(true);
    expect(next.snapshot.streak).toBe(1);
  });

  it('compares against real players once 20 have finished', async () => {
    const h = await makeHarness();
    await h.seedCohort(DAY, Array.from({ length: 19 }, (_, i) => 10 + i));
    const engine = new GameEngine(h.store, seededRng(7));
    const r = await playFive(engine);
    const report = r.snapshot.report!;
    expect(report.simulatedField).toBe(false);
    const lower = Array.from({ length: 19 }, (_, i) => 10 + i).filter((s) => s < report.dailyScore).length;
    expect(report.percentile).toBeCloseTo((100 * lower) / 19, 6);
  });

  it('derives the collection from results and tracks viewed items', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(8));
    let r = await engine.handle(ctx(), { op: 'start', game: 'mystery-card-pack' });
    expect(r.snapshot.collection.filter((c) => c.type === 'card').length).toBeGreaterThan(0);
    expect(r.snapshot.collection.every((c) => c.isNew)).toBe(true);
    const first = r.snapshot.collection[0];
    r = await engine.handle(ctx(), { op: 'markViewed', items: [{ type: first.type, itemId: first.itemId }] });
    expect(r.snapshot.collection.find((c) => c.itemId === first.itemId)?.isNew).toBe(false);
  });

  it('never lets concurrent requests exceed five games', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(9));
    const games = ['dice-of-destiny', 'falling-star', 'three-chests', 'lucky-number', 'coin-streak', 'gem-breaker', 'lucky-fishing'];
    const results = await Promise.allSettled(games.map((game) => engine.handle(ctx(), { op: 'start', game })));
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(5);
    const r = await engine.handle(ctx(), { op: 'snapshot' });
    expect(r.snapshot.board).toHaveLength(5);
    expect(Object.keys(r.snapshot.sessions)).toHaveLength(5);
  });

  it('keeps players separate', async () => {
    const engine = new GameEngine((await makeHarness()).store, seededRng(10));
    await engine.handle(ctx(A), { op: 'start', game: 'dice-of-destiny' });
    const b = await engine.handle(ctx(B), { op: 'snapshot' });
    expect(b.snapshot.board).toEqual([]);
    expect(b.snapshot.collection).toEqual([]);
  });
});

describe('request validation', () => {
  it('accepts valid requests', () => {
    expect(validateRequest({ op: 'start', game: 'wishing-well', input: { wish: 'Love' } })).toEqual({
      op: 'start',
      game: 'wishing-well',
      input: { wish: 'Love' },
    });
    expect(validateRequest({ op: 'act', game: 'lucky-number', action: { type: 'guess', value: 42 } }).op).toBe('act');
  });

  it('rejects malformed or hostile requests', () => {
    const bad: unknown[] = [
      null,
      { op: 'drop tables' },
      { op: 'start', game: 'cosmic-alignment' },
      { op: 'start', game: 'wishing-well', input: { wish: 'Riches' } },
      { op: 'movePick', from: -1, to: 2 },
      { op: 'act', game: 'coin-streak', action: { type: 'flip', call: 'edge' } },
      { op: 'saveProgress', game: 'dice-of-destiny', progress: { x: 'y'.repeat(5000) } },
      { op: 'markViewed', items: [{ type: 'weapon', itemId: 'x' }] },
    ];
    for (const b of bad) expect(() => validateRequest(b), JSON.stringify(b)?.slice(0, 60)).toThrow(GameError);
  });
});
