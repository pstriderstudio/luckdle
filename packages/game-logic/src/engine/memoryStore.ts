/**
 * In-memory EngineStore, used by tests and (with localStorage persistence)
 * by the browser playtest service. Its state is plain JSON.
 */
import type { GameId } from '../catalog.ts';
import type { OwnedItem } from './rules.ts';
import type { DayTx, EngineStore, StoredResult } from './store.ts';

export interface MemoryState {
  version: 2;
  players: string[];
  /** playerId → gameDay → board (game ids in order). */
  boards: Record<string, Record<string, GameId[]>>;
  /** playerId → results, any order. */
  results: Record<string, StoredResult[]>;
  /** playerId → viewed item keys (“type:id”). */
  viewed: Record<string, string[]>;
  /** gameDay → playerId → daily score. */
  daily: Record<string, Record<string, { score: number; percentile: number }>>;
}

export function emptyMemoryState(): MemoryState {
  return { version: 2, players: [], boards: {}, results: {}, viewed: {}, daily: {} };
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class MemoryStore implements EngineStore {
  state: MemoryState;
  private readonly onChange: () => void;
  private queue: Promise<unknown> = Promise.resolve();

  /** `onChange` is called after every change (e.g. to persist). */
  constructor(state: MemoryState = emptyMemoryState(), onChange: () => void = () => {}) {
    this.state = state;
    this.onChange = onChange;
  }

  async ensurePlayer(playerId: string) {
    if (!this.state.players.includes(playerId)) {
      this.state.players.push(playerId);
      this.onChange();
    }
  }

  withDay<T>(playerId: string, gameDay: string, fn: (day: DayTx) => Promise<T>): Promise<T> {
    const s = this.state;
    const results = () => (s.results[playerId] ??= []);
    const changed = () => this.onChange();
    const day: DayTx = {
      async getBoard() {
        const b = s.boards[playerId]?.[gameDay];
        return b ? [...b] : null;
      },
      async latestBoardBefore() {
        const days = Object.keys(s.boards[playerId] ?? {})
          .filter((d) => d < gameDay)
          .sort();
        const last = days.pop();
        return last ? [...s.boards[playerId][last]] : null;
      },
      async setBoard(games) {
        (s.boards[playerId] ??= {})[gameDay] = [...games];
        changed();
      },
      async results() {
        return clone(results().filter((r) => r.gameDay === gameDay));
      },
      async insertResult(result: StoredResult, _items: OwnedItem[]) {
        if (results().some((r) => r.gameDay === gameDay && r.gameId === result.gameId)) return false;
        results().push(clone(result));
        changed();
        return true;
      },
      async updateResult(gameId, patch) {
        const r = results().find((x) => x.gameDay === gameDay && x.gameId === gameId);
        if (!r) throw new Error('No such result');
        Object.assign(r, clone(patch));
        changed();
      },
      async cohortScores() {
        return Object.entries(s.daily[gameDay] ?? {})
          .filter(([player]) => player !== playerId)
          .map(([, d]) => d.score);
      },
      async luckyNumberCounts(fromDay, toDay) {
        const counts: Record<number, number> = {};
        for (const list of Object.values(s.results)) {
          for (const r of list) {
            if (r.gameId !== 'lucky-number' || !r.completed || r.gameDay < fromDay || r.gameDay >= toDay) continue;
            const g = (r.outcome as { guesses: number[] }).guesses.length;
            counts[g] = (counts[g] ?? 0) + 1;
          }
        }
        return counts;
      },
      async saveDailyScore(score, percentile) {
        (s.daily[gameDay] ??= {})[playerId] = { score, percentile };
        changed();
      },
    };
    // Serialise transactions so concurrent calls behave like row locks.
    const run = this.queue.then(() => fn(day));
    this.queue = run.catch(() => undefined);
    return run;
  }

  async allResults(playerId: string) {
    return clone(this.state.results[playerId] ?? []).sort((a, b) => a.gameDay.localeCompare(b.gameDay));
  }

  async viewedItems(playerId: string) {
    return new Set(this.state.viewed[playerId] ?? []);
  }

  async markViewed(playerId: string, keys: string[]) {
    const set = new Set(this.state.viewed[playerId] ?? []);
    for (const k of keys) set.add(k);
    this.state.viewed[playerId] = [...set];
    this.onChange();
  }

  async cohortScores(gameDay: string, excludePlayer: string) {
    return Object.entries(this.state.daily[gameDay] ?? {})
      .filter(([player]) => player !== excludePlayer)
      .map(([, d]) => d.score);
  }
}
