/**
 * The game service is the only way the UI reaches game state. The playtest
 * build uses LocalGameService (outcomes generated in this browser); the
 * Supabase service calls the Edge Function, which runs the same engine on
 * the server and returns only what has been revealed.
 */
import type {
  GameAction,
  GameId,
  GameSession,
  ItemType,
  Progress,
  Snapshot,
  StartInput,
} from '@luckdle/game-logic';

export type {
  CoinFlipView,
  CollectionEntry,
  DailyReport,
  GameAction,
  GameSession,
  GameView,
  ItemType,
  Progress,
  ResultSummary,
  Snapshot,
  StartInput,
  ViewOf,
} from '@luckdle/game-logic';

export interface GameService {
  /** 'playtest' = outcomes generated in this browser; 'server' = the Supabase game service. */
  readonly kind: 'playtest' | 'server';
  snapshot(): Promise<Snapshot>;

  addPick(game: GameId): Promise<void>;
  removePick(game: GameId): Promise<void>;
  movePick(from: number, to: number): Promise<void>;
  /** Replaces an unplayed pick with another game, keeping its position. */
  swapPick(out: GameId, into: GameId): Promise<void>;
  clearBoard(): Promise<void>;

  /**
   * Generates and saves the outcome; the game locks from this moment.
   * A game not yet on the board is added to it first (fails when the board is full).
   */
  start(game: GameId, input?: StartInput): Promise<GameSession>;
  act(game: GameId, action: GameAction): Promise<GameSession>;
  saveProgress(game: GameId, progress: Progress): Promise<void>;
  /** Marks the reveal finished and returns the final result. */
  finish(game: GameId): Promise<GameSession>;

  markViewed(items: { type: ItemType; itemId: string }[]): Promise<void>;

  /** Playtest / dev controls (absent in production). */
  playtest?: {
    nextDay(): Promise<void>;
    resetToday?(): Promise<void>;
    resetAll?(): Promise<void>;
  };
}
