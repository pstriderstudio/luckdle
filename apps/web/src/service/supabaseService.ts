/**
 * Game service backed by Supabase: players sign in anonymously on first
 * visit (the session persists in this browser) and every request goes to
 * the `game` Edge Function, which runs the shared engine on the server.
 */
import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { GameId, ServiceRequest, ServiceResponse } from '@luckdle/game-logic';
import type { GameAction, GameService, GameSession, ItemType, Progress, Snapshot, StartInput } from './types.ts';

const DAY_OFFSET_KEY = 'luckdle.devDayOffset';

function readOffset(): number {
  try {
    return Number(localStorage.getItem(DAY_OFFSET_KEY)) || 0;
  } catch {
    return 0;
  }
}

export class SupabaseGameService implements GameService {
  readonly kind = 'server' as const;
  private readonly supabase: SupabaseClient;
  private readonly ready: Promise<void>;
  private readonly devTools: boolean;
  /** Snapshot returned by the latest request, served to the next snapshot() call. */
  private fresh: Snapshot | null = null;

  constructor(url: string, anonKey: string, devTools = false) {
    this.supabase = createClient(url, anonKey);
    this.devTools = devTools;
    this.ready = this.signIn();
    if (devTools) {
      this.playtest = {
        nextDay: async () => {
          try {
            localStorage.setItem(DAY_OFFSET_KEY, String(readOffset() + 1));
          } catch {
            // ignore
          }
        },
      };
    }
  }

  playtest?: GameService['playtest'];

  private async signIn() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) return;
    const { error } = await this.supabase.auth.signInAnonymously();
    if (error) throw new Error(`Could not start a player session: ${error.message}`);
  }

  private async call(request: ServiceRequest): Promise<ServiceResponse> {
    await this.ready;
    const headers: Record<string, string> = {};
    if (this.devTools && readOffset() > 0) headers['x-luckdle-day-offset'] = String(readOffset());
    const { data, error } = await this.supabase.functions.invoke<ServiceResponse>('game', { body: request, headers });
    if (error) {
      let message = 'Could not reach the game server. Please try again.';
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (body?.error) message = body.error;
      }
      throw new Error(message);
    }
    this.fresh = data!.snapshot;
    return data!;
  }

  async snapshot(): Promise<Snapshot> {
    const snapshot = this.fresh ?? (await this.call({ op: 'snapshot' })).snapshot;
    this.fresh = null;
    return this.devTools ? { ...snapshot, playtest: { dayOffset: readOffset() } } : snapshot;
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
    // Progress saves don't change what the page shows; don't force a re-render.
    this.fresh = null;
  }

  async finish(game: GameId): Promise<GameSession> {
    return (await this.call({ op: 'finish', game })).session!;
  }

  async markViewed(items: { type: ItemType; itemId: string }[]) {
    await this.call({ op: 'markViewed', items });
  }
}
