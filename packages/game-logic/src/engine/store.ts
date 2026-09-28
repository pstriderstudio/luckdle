/**
 * Storage the game engine needs. Implemented in memory (tests and the
 * browser playtest) and over Postgres (the Supabase Edge Function).
 */
import type { GameId } from '../catalog.ts';
import type { Progress } from './api.ts';
import type { OwnedItem, Outcome } from './rules.ts';

export interface StoredResult {
  gameDay: string;
  gameId: GameId;
  /** Full outcome, including anything not yet revealed. Never sent to players. */
  outcome: Outcome;
  progress: Progress;
  completed: boolean;
  /** Final luck score, set when completed. */
  score: number | null;
  label: string | null;
  createdAt: string;
}

/** Operations on one player's game day, run atomically by {@link EngineStore.withDay}. */
export interface DayTx {
  /** Today's board (game ids in order), or null if none has been created yet. */
  getBoard(): Promise<GameId[] | null>;
  /** The most recent earlier board, for carry-over. */
  latestBoardBefore(): Promise<GameId[] | null>;
  setBoard(games: GameId[]): Promise<void>;
  /** Results for this game day. */
  results(): Promise<StoredResult[]>;
  /** Inserts a new result with the items it awards; returns false if one already exists for the game. */
  insertResult(result: StoredResult, items: OwnedItem[]): Promise<boolean>;
  updateResult(
    gameId: GameId,
    patch: Partial<Pick<StoredResult, 'outcome' | 'progress' | 'completed' | 'score' | 'label'>>,
  ): Promise<void>;
  /** Daily scores of other players who finished this game day (same as EngineStore.cohortScores). */
  cohortScores(): Promise<number[]>;
  /** Records the player's daily score once all five games are complete. */
  saveDailyScore(score: number, percentile: number): Promise<void>;
}

export interface EngineStore {
  /** Creates the player record if needed. */
  ensurePlayer(playerId: string): Promise<void>;
  /**
   * Runs `fn` in one transaction with the player's game day locked, so
   * concurrent requests cannot exceed five picks or start a game twice.
   */
  withDay<T>(playerId: string, gameDay: string, fn: (day: DayTx) => Promise<T>): Promise<T>;
  /** Every result the player has, oldest game day first. */
  allResults(playerId: string): Promise<StoredResult[]>;
  viewedItems(playerId: string): Promise<Set<string>>;
  markViewed(playerId: string, keys: string[]): Promise<void>;
  /** Daily scores of other players who finished all five games on this game day. */
  cohortScores(gameDay: string, excludePlayer: string): Promise<number[]>;
}
