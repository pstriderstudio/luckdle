/**
 * Playtest game service: runs the shared game engine in this browser with an
 * in-memory store persisted to localStorage. Not cheat-proof — it exists so
 * the site can be played without a server. Playtest controls let one browser
 * move to the next game day or reset.
 */
import {
  emptyMemoryState,
  GameEngine,
  type GameId,
  gameDayOf,
  isGameId,
  type MemoryState,
  MemoryStore,
  rules,
  type ServiceRequest,
  type ServiceResponse,
  shiftGameDay,
  type StoredResult,
} from '@luckdle/game-logic';
import type { GameAction, GameService, GameSession, ItemType, Progress, Snapshot, StartInput } from './types.ts';

const STORAGE_KEY = 'luckdle.playtest.v2';
const LEGACY_KEY = 'luckdle.playtest.v1';
const PLAYER = 'playtest-player';

interface Saved {
  dayOffset: number;
  state: MemoryState;
}

/** Converts playtest data saved before the engine existed (v1), dropping retired games. */
function fromLegacy(raw: string): Saved | null {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const v1 = JSON.parse(raw) as any;
    if (v1?.version !== 1) return null;
    const state = emptyMemoryState();
    state.players.push(PLAYER);
    state.viewed[PLAYER] = v1.viewed ?? [];
    const boards: Record<string, GameId[]> = {};
    const results: StoredResult[] = [];
    for (const [gameDay, day] of Object.entries<any>(v1.days ?? {})) {
      boards[gameDay] = (day.board ?? []).map((s: any) => s.game).filter(isGameId);
      for (const [gameId, r] of Object.entries<any>(day.results ?? {})) {
        if (!isGameId(gameId)) continue;
        const summary = r.completed ? rules.evaluate(gameId, r.outcome) : null;
        results.push({
          gameDay,
          gameId,
          outcome: r.outcome,
          progress: r.progress ?? {},
          completed: Boolean(r.completed),
          score: summary?.score ?? null,
          label: summary?.label ?? null,
          createdAt: r.createdAt ?? '',
        });
      }
    }
    state.boards[PLAYER] = boards;
    state.results[PLAYER] = results;
    return { dayOffset: v1.dayOffset ?? 0, state };
  } catch {
    return null;
  }
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      if (saved?.state?.version === 2) return saved;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    const converted = legacy ? fromLegacy(legacy) : null;
    if (converted) {
      localStorage.removeItem(LEGACY_KEY);
      return converted;
    }
  } catch {
    // Unreadable storage: start fresh.
  }
  return { dayOffset: 0, state: emptyMemoryState() };
}

export class LocalGameService implements GameService {
  readonly kind = 'playtest' as const;
  private saved: Saved;
  private store: MemoryStore;
  private engine: GameEngine;
  private readonly clock: () => Date;

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock;
    this.saved = load();
    this.store = new MemoryStore(this.saved.state, () => this.persist());
    this.engine = new GameEngine(this.store);
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    } catch {
      // Storage unavailable; state lasts for this visit only.
    }
  }

  private today(): string {
    return shiftGameDay(gameDayOf(this.clock()), this.saved.dayOffset);
  }

  private call(request: ServiceRequest): Promise<ServiceResponse> {
    return this.engine.handle({ playerId: PLAYER, gameDay: this.today(), now: this.clock() }, request);
  }

  async snapshot(): Promise<Snapshot> {
    const { snapshot } = await this.call({ op: 'snapshot' });
    return { ...snapshot, playtest: { dayOffset: this.saved.dayOffset } };
  }

  async addPick(game: GameId) {
    await this.call({ op: 'addPick', game });
  }

  async removePick(game: GameId) {
    await this.call({ op: 'removePick', game });
  }

  async movePick(from: number, to: number) {
    await this.call({ op: 'movePick', from, to });
  }

  async swapPick(out: GameId, into: GameId) {
    await this.call({ op: 'swapPick', out, into });
  }

  async clearBoard() {
    await this.call({ op: 'clearBoard' });
  }

  async start(game: GameId, input?: StartInput): Promise<GameSession> {
    return (await this.call({ op: 'start', game, input })).session!;
  }

  async act(game: GameId, action: GameAction): Promise<GameSession> {
    return (await this.call({ op: 'act', game, action })).session!;
  }

  async saveProgress(game: GameId, progress: Progress) {
    await this.call({ op: 'saveProgress', game, progress });
  }

  async finish(game: GameId): Promise<GameSession> {
    return (await this.call({ op: 'finish', game })).session!;
  }

  async markViewed(items: { type: ItemType; itemId: string }[]) {
    await this.call({ op: 'markViewed', items });
  }

  playtest = {
    nextDay: async () => {
      this.saved.dayOffset += 1;
      this.persist();
    },
    resetToday: async () => {
      const today = this.today();
      const s = this.saved.state;
      delete s.boards[PLAYER]?.[today];
      s.results[PLAYER] = (s.results[PLAYER] ?? []).filter((r) => r.gameDay !== today);
      delete s.daily[today];
      this.persist();
    },
    resetAll: async () => {
      this.saved = { dayOffset: 0, state: emptyMemoryState() };
      this.store = new MemoryStore(this.saved.state, () => this.persist());
      this.engine = new GameEngine(this.store);
      this.persist();
    },
  };
}
