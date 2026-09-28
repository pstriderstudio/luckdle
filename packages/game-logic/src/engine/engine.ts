/**
 * The game engine: every rule about boards, official plays, reveals,
 * collections, and the daily report, independent of where data is stored.
 * The browser playtest and the Supabase Edge Function both run this code.
 */
import { addPick, clearBoard, moveSlot, type PersonalBoard, removePick, swapPick } from '../board.ts';
import { GAMES_PER_DAY, dailyLabel, dailyScore, MIN_LIVE_COHORT, newCardPriorityActive, percentile, shareCard, simulatedField, streakLength } from '../daily.ts';
import { type GameId, isGameId } from '../catalog.ts';
import { nextReset, shiftGameDay } from '../gameDay.ts';
import { type Rng, secureRng, seededRng } from '../rng.ts';
import { WISHES } from '../games/wishingWell.ts';
import * as luckyNumber from '../games/luckyNumber.ts';
import type { ItemType } from '../collections.ts';
import type {
  CollectionEntry,
  DailyReport,
  GameAction,
  GameSession,
  Progress,
  ServiceRequest,
  ServiceResponse,
  Snapshot,
  StartInput,
} from './api.ts';
import { applyAction, evaluate, generate, isResolved, itemsOf, mutationRarity, type OwnedItem, toView } from './rules.ts';
import type { DayTx, EngineStore, StoredResult } from './store.ts';

export interface PlayerContext {
  playerId: string;
  /** The game day this request belongs to (computed by the caller from its clock). */
  gameDay: string;
  now: Date;
}

/** Thrown for invalid requests; the message is safe to show to players. */
export class GameError extends Error {}

const MAX_PROGRESS_BYTES = 4096;
const fieldCache = new Map<string, number[]>();

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The simulated field for a game day (deterministic, cached). */
function fieldFor(gameDay: string): number[] {
  let field = fieldCache.get(gameDay);
  if (!field) {
    field = simulatedField(seededRng(hashString(gameDay)), 1000);
    if (fieldCache.size > 8) fieldCache.clear();
    fieldCache.set(gameDay, field);
  }
  return field;
}

function toSession(r: StoredResult): GameSession {
  return {
    gameId: r.gameId,
    view: toView(r.gameId, r.outcome),
    progress: r.progress,
    completed: r.completed,
    result: r.completed ? evaluate(r.gameId, r.outcome) : null,
  } as GameSession;
}

function asBoard(games: GameId[], results: StoredResult[]): PersonalBoard {
  return games.map((game) => ({ game, played: results.some((r) => r.gameId === game) }));
}

export class GameEngine {
  private readonly store: EngineStore;
  private readonly rng: Rng;

  constructor(store: EngineStore, rng: Rng = secureRng()) {
    this.store = store;
    this.rng = rng;
  }

  // -------------------------------------------------------------------------
  // Request dispatch (used by the Edge Function and the playtest service)

  async handle(ctx: PlayerContext, request: unknown): Promise<ServiceResponse> {
    const req = validateRequest(request);
    await this.store.ensurePlayer(ctx.playerId);
    let session: GameSession | undefined;
    switch (req.op) {
      case 'snapshot':
        break;
      case 'addPick':
        await this.editBoard(ctx, (b) => addPick(b, req.game));
        break;
      case 'removePick':
        await this.editBoard(ctx, (b) => removePick(b, req.game));
        break;
      case 'movePick':
        await this.editBoard(ctx, (b) => moveSlot(b, req.from, req.to));
        break;
      case 'swapPick':
        await this.editBoard(ctx, (b) => swapPick(b, req.out, req.into));
        break;
      case 'clearBoard':
        await this.editBoard(ctx, clearBoard);
        break;
      case 'start':
        session = await this.start(ctx, req.game, req.input);
        break;
      case 'act':
        session = await this.act(ctx, req.game, req.action);
        break;
      case 'saveProgress':
        await this.saveProgress(ctx, req.game, req.progress);
        break;
      case 'finish':
        session = await this.finish(ctx, req.game);
        break;
      case 'markViewed':
        await this.store.markViewed(ctx.playerId, req.items.map((i) => `${i.type}:${i.itemId}`));
        break;
    }
    return { snapshot: await this.snapshot(ctx), session };
  }

  // -------------------------------------------------------------------------
  // Board

  /** Today's board, carrying the most recent earlier board over (unplayed) the first time. */
  private async boardOf(day: DayTx): Promise<{ games: GameId[]; results: StoredResult[] }> {
    let games = await day.getBoard();
    if (games === null) {
      games = ((await day.latestBoardBefore()) ?? []).filter(isGameId).slice(0, GAMES_PER_DAY);
      await day.setBoard(games);
    }
    return { games, results: await day.results() };
  }

  private async editBoard(ctx: PlayerContext, edit: (b: PersonalBoard) => PersonalBoard) {
    await this.store.withDay(ctx.playerId, ctx.gameDay, async (day) => {
      const { games, results } = await this.boardOf(day);
      const next = guard(() => edit(asBoard(games, results)));
      await day.setBoard(next.map((s) => s.game));
    });
  }

  // -------------------------------------------------------------------------
  // Official plays

  async start(ctx: PlayerContext, game: GameId, input?: StartInput): Promise<GameSession> {
    const history = await this.store.allResults(ctx.playerId);
    return this.store.withDay(ctx.playerId, ctx.gameDay, async (day) => {
      const { games, results } = await this.boardOf(day);
      const existing = results.find((r) => r.gameId === game);
      if (existing) return toSession(existing);
      // Playing a game adds it to the board (one of today's five picks).
      if (!games.includes(game)) {
        const next = guard(() => addPick(asBoard(games, results), game));
        await day.setBoard(next.map((s) => s.game));
      }
      const owned = ownedByType(history);
      const playedBefore = playedDays(history).filter((d) => d < ctx.gameDay);
      const outcome = guard(() =>
        generate(game, {
          rng: this.rng,
          owned,
          newCardPriority: newCardPriorityActive(playedBefore, ctx.gameDay),
          input,
        }),
      );
      const result: StoredResult = {
        gameDay: ctx.gameDay,
        gameId: game,
        outcome,
        progress: {},
        completed: false,
        score: null,
        label: null,
        createdAt: ctx.now.toISOString(),
      };
      // The outcome (and any collectibles) is saved before anything is revealed.
      const inserted = await day.insertResult(result, itemsOf(game, outcome));
      if (!inserted) {
        const again = (await day.results()).find((r) => r.gameId === game);
        if (again) return toSession(again);
      }
      return toSession(result);
    });
  }

  async act(ctx: PlayerContext, game: GameId, action: GameAction): Promise<GameSession> {
    return this.store.withDay(ctx.playerId, ctx.gameDay, async (day) => {
      const r = (await day.results()).find((x) => x.gameId === game);
      if (!r) throw new GameError('This game has not been started today');
      guard(() => applyAction(game, r.outcome, action));
      await day.updateResult(game, { outcome: r.outcome });
      return toSession(r);
    });
  }

  async saveProgress(ctx: PlayerContext, game: GameId, progress: Progress): Promise<void> {
    await this.store.withDay(ctx.playerId, ctx.gameDay, async (day) => {
      const r = (await day.results()).find((x) => x.gameId === game);
      if (r && !r.completed) await day.updateResult(game, { progress });
    });
  }

  async finish(ctx: PlayerContext, game: GameId): Promise<GameSession> {
    return this.store.withDay(ctx.playerId, ctx.gameDay, async (day) => {
      const { games, results } = await this.boardOf(day);
      const r = results.find((x) => x.gameId === game);
      if (!r) throw new GameError('This game has not been started today');
      if (!isResolved(game, r.outcome)) throw new GameError('This game is not finished yet');
      if (!r.completed) {
        if (game === 'lucky-number' && !r.outcome.scoring) {
          // Score against real players' recent results (past days only, so this never changes later).
          const from = shiftGameDay(ctx.gameDay, -luckyNumber.REFERENCE_WINDOW_DAYS);
          const counts = await day.luckyNumberCounts(from, ctx.gameDay);
          r.outcome.scoring = luckyNumber.scoreLuckyNumber(r.outcome.guesses.length, counts);
        }
        const summary = evaluate(game, r.outcome);
        r.completed = true;
        r.score = summary.score;
        r.label = summary.label;
        await day.updateResult(game, { outcome: r.outcome, completed: true, score: summary.score, label: summary.label });
        const report = await this.report(ctx, games, results, () => day.cohortScores());
        if (report) await day.saveDailyScore(report.dailyScore, report.percentile);
      }
      return toSession(r);
    });
  }

  // -------------------------------------------------------------------------
  // Snapshot

  async snapshot(ctx: PlayerContext): Promise<Snapshot> {
    const { games, results } = await this.store.withDay(ctx.playerId, ctx.gameDay, (day) => this.boardOf(day));
    const history = await this.store.allResults(ctx.playerId);
    const viewed = await this.store.viewedItems(ctx.playerId);
    const played = playedDays(history);
    const streakEnd = played.includes(ctx.gameDay) ? ctx.gameDay : shiftGameDay(ctx.gameDay, -1);
    const sessions: Snapshot['sessions'] = {};
    for (const r of results) sessions[r.gameId] = toSession(r);
    return {
      gameDay: ctx.gameDay,
      nextReset: nextReset(ctx.now).toISOString(),
      board: asBoard(games, results),
      sessions,
      streak: streakLength(played, streakEnd),
      newCardPriority: newCardPriorityActive(
        played.filter((d) => d < ctx.gameDay),
        ctx.gameDay,
      ),
      collection: collectionOf(history, viewed),
      report: await this.report(ctx, games, results, () => this.store.cohortScores(ctx.gameDay, ctx.playerId)),
    };
  }

  /** The daily report once all five games on the board are complete. */
  private async report(
    ctx: PlayerContext,
    games: GameId[],
    results: StoredResult[],
    cohortScores: () => Promise<number[]>,
  ): Promise<DailyReport | null> {
    if (games.length !== GAMES_PER_DAY) return null;
    const rows = [];
    for (const game of games) {
      const r = results.find((x) => x.gameId === game);
      if (!r?.completed) return null;
      const s = evaluate(game, r.outcome);
      rows.push({ gameId: game, score: s.score, label: s.label });
    }
    const score = dailyScore(rows.map((r) => r.score));
    const cohort = await cohortScores();
    // Fewer than 20 finished players (including this one): compare against a simulated field.
    const simulated = cohort.length + 1 < MIN_LIVE_COHORT;
    const pct = percentile(score, simulated ? fieldFor(ctx.gameDay) : cohort);
    const label = dailyLabel(pct);
    return {
      gameDay: ctx.gameDay,
      dailyScore: score,
      percentile: pct,
      label,
      simulatedField: simulated,
      final: false,
      rows,
      shareText: shareCard({ gameDay: ctx.gameDay, dailyScore: score, dailyLabel: label, gameLabels: rows.map((r) => r.label) }),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers

/** Runs rule code, turning rule violations into player-safe GameErrors. */
function guard<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GameError) throw e;
    throw new GameError((e as Error).message);
  }
}

function playedDays(history: StoredResult[]): string[] {
  return [...new Set(history.filter((r) => r.completed).map((r) => r.gameDay))];
}

function ownedByType(history: StoredResult[]): (type: ItemType) => Set<string> {
  const owned = new Map<ItemType, Set<string>>();
  for (const r of history) {
    for (const item of itemsOf(r.gameId, r.outcome)) {
      if (!owned.has(item.type)) owned.set(item.type, new Set());
      owned.get(item.type)!.add(item.itemId);
    }
  }
  return (type) => owned.get(type) ?? new Set();
}

/** Ownership derived from saved results, with personal bests. */
export function collectionOf(history: StoredResult[], viewed: Set<string>): CollectionEntry[] {
  const byKey = new Map<string, { first: OwnedItem; firstGameDay: string; details: Record<string, any>[] }>();
  const ordered = [...history].sort((a, b) => a.gameDay.localeCompare(b.gameDay) || a.createdAt.localeCompare(b.createdAt));
  for (const r of ordered) {
    for (const item of itemsOf(r.gameId, r.outcome)) {
      const key = `${item.type}:${item.itemId}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { first: item, firstGameDay: r.gameDay, details: [] };
        byKey.set(key, entry);
      }
      if (item.details) entry.details.push(item.details);
    }
  }
  return [...byKey.entries()].map(([key, { first, firstGameDay, details }]) => {
    const entry: CollectionEntry = {
      type: first.type,
      itemId: first.itemId,
      tier: first.tier,
      firstGameDay,
      isNew: !viewed.has(key),
    };
    if (details.length > 0) {
      if (first.type === 'fish') {
        entry.best = {
          length: Math.max(...details.map((d) => d.length)),
          trait: Math.max(...details.map((d) => d.trait)),
        };
      } else if (first.type === 'gem') {
        const largest = [...details].sort((a, b) => b.size - a.size || b.carats - a.carats)[0];
        entry.best = { size: largest.size, carats: largest.carats, purity: Math.max(...details.map((d) => d.purity)) };
      } else if (first.type === 'plant') {
        const rarest = [...details].sort((a, b) => mutationRarity(a.mutations) - mutationRarity(b.mutations))[0];
        entry.best = { mutations: rarest.mutations };
      }
    }
    return entry;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const ITEM_TYPES = ['card', 'character', 'fish', 'curio', 'gem', 'plant'];

/** Validates an untrusted request body. */
export function validateRequest(raw: unknown): ServiceRequest {
  const r = raw as any;
  const fail = (msg = 'Invalid request'): never => {
    throw new GameError(msg);
  };
  if (!r || typeof r !== 'object' || typeof r.op !== 'string') fail();
  const game = (g: unknown): GameId => (isGameId(g) ? g : fail('Unknown game'));
  const index = (n: unknown): number => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < GAMES_PER_DAY ? (n as number) : fail());
  switch (r.op) {
    case 'snapshot':
    case 'clearBoard':
      return { op: r.op };
    case 'addPick':
    case 'removePick':
    case 'finish':
      return { op: r.op, game: game(r.game) };
    case 'movePick':
      return { op: 'movePick', from: index(r.from), to: index(r.to) };
    case 'swapPick':
      return { op: 'swapPick', out: game(r.out), into: game(r.into) };
    case 'start': {
      const input: StartInput = {};
      if (r.input?.wish !== undefined) input.wish = WISHES.includes(r.input.wish) ? r.input.wish : fail('Unknown wish');
      return { op: 'start', game: game(r.game), input };
    }
    case 'act': {
      const a = r.action;
      let action: GameAction;
      if (a?.type === 'flip' && (a.call === 'heads' || a.call === 'tails')) action = { type: 'flip', call: a.call };
      else if (a?.type === 'pick' && Number.isInteger(a.chest)) action = { type: 'pick', chest: a.chest };
      else if (a?.type === 'guess' && Number.isInteger(a.value)) action = { type: 'guess', value: a.value };
      else return fail('Invalid action');
      return { op: 'act', game: game(r.game), action };
    }
    case 'saveProgress': {
      const p = r.progress;
      if (!p || typeof p !== 'object' || Array.isArray(p) || JSON.stringify(p).length > MAX_PROGRESS_BYTES) fail('Invalid progress');
      return { op: 'saveProgress', game: game(r.game), progress: p };
    }
    case 'markViewed': {
      if (!Array.isArray(r.items) || r.items.length > 500) fail();
      const items = r.items.map((i: any) =>
        ITEM_TYPES.includes(i?.type) && typeof i?.itemId === 'string' && i.itemId.length < 64
          ? { type: i.type as ItemType, itemId: i.itemId as string }
          : fail(),
      );
      return { op: 'markViewed', items };
    }
    default:
      return fail('Unknown operation');
  }
}
