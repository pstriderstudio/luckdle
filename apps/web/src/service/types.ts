/**
 * The game service is the only way the UI reaches game state. The playtest
 * build uses LocalGameService (outcomes generated in this browser); the
 * Supabase-backed service will implement the same interface, generating
 * outcomes in Edge Functions and returning only what has been revealed.
 */
import type {
  cardPack,
  coinStreak,
  dailySummon,
  GameId,
  gardenOfChance,
  gemBreaker,
  luckyFishing,
  luckyNumber,
  LuckLabel,
  PersonalBoard,
  threeChests,
  wishingWell,
} from '@luckdle/game-logic';

export interface ResultSummary {
  score: number;
  label: LuckLabel;
  /** Probability of this result; “about 1 in N” = 1 / probability. 0 when not meaningful. */
  probability: number;
  /** One-line description of the result, e.g. “Full house”. */
  headline: string;
}

export interface CoinFlipView {
  call: coinStreak.CoinFace;
  face: coinStreak.CoinFace;
  hit: boolean;
}

export type GameView =
  | { game: 'dice-of-destiny'; dice: number[]; combination: string }
  | { game: 'mystery-card-pack'; cards: cardPack.PackCard[]; podium: number[]; newCardPriority: boolean }
  | { game: 'daily-summon'; pulls: dailySummon.SummonPull[] }
  | { game: 'lucky-fishing'; catch: luckyFishing.FishingOutcome }
  | { game: 'coin-streak'; flips: CoinFlipView[]; misses: number; over: boolean }
  | { game: 'falling-star'; slot: number; entry: number }
  | { game: 'three-chests'; pick: number | null; chests: (threeChests.Treasure | null)[] }
  | { game: 'wishing-well'; wish: wishingWell.Wish; curioId: string; tier: wishingWell.WellTier }
  | { game: 'gem-breaker'; find: gemBreaker.GemOutcome }
  | {
      game: 'lucky-number';
      digits: number;
      guesses: { guess: number; feedback: luckyNumber.GuessFeedback }[];
      revealed: (string | null)[];
      solved: boolean;
    }
  | { game: 'garden-of-chance'; bloom: gardenOfChance.GardenOutcome };

export type ViewOf<G extends GameId> = Extract<GameView, { game: G }>;

export type Progress = Record<string, unknown>;

export interface GameSession<G extends GameId = GameId> {
  gameId: G;
  view: ViewOf<G>;
  /** Client reveal position, saved so leaving and returning resumes at the same point. */
  progress: Progress;
  /** The reveal has finished and the result is final. */
  completed: boolean;
  /** Present once completed. */
  result: ResultSummary | null;
}

export type GameAction =
  | { type: 'flip'; call: coinStreak.CoinFace }
  | { type: 'pick'; chest: number }
  | { type: 'guess'; value: number };

export interface StartInput {
  wish?: wishingWell.Wish;
}

export type ItemType = 'card' | 'character' | 'fish' | 'curio' | 'gem' | 'plant';

export interface CollectionEntry {
  type: ItemType;
  itemId: string;
  tier: string;
  firstGameDay: string;
  isNew: boolean;
  /** Personal bests (fish, gems, plants). */
  best?: {
    length?: number;
    trait?: number;
    size?: number;
    carats?: number;
    purity?: number;
    mutations?: string[];
  };
}

export interface DailyReport {
  gameDay: string;
  dailyScore: number;
  percentile: number;
  label: LuckLabel;
  /** True while comparing against a simulated field (fewer than 20 finished players). */
  simulatedField: boolean;
  /** Live through the day; final at the reset. */
  final: boolean;
  rows: { gameId: GameId; score: number; label: LuckLabel }[];
  shareText: string;
}

export interface Snapshot {
  gameDay: string;
  /** ISO instant of the next 3 AM Eastern reset. */
  nextReset: string;
  board: PersonalBoard;
  sessions: Partial<Record<GameId, GameSession>>;
  /** Consecutive game days with at least one completed game (alive if today or yesterday). */
  streak: number;
  /** Card packs opened today get new-card priority. */
  newCardPriority: boolean;
  collection: CollectionEntry[];
  report: DailyReport | null;
  /** Playtest-only information. */
  playtest?: { dayOffset: number };
}

export interface GameService {
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

  /** Playtest controls (absent on the real service). */
  playtest?: {
    nextDay(): Promise<void>;
    resetToday(): Promise<void>;
    resetAll(): Promise<void>;
  };
}
