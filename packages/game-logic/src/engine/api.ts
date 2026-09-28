/**
 * The game service API shared by the web client, the browser playtest
 * service, and the Supabase Edge Function. Everything here is what a player
 * may see: views never contain unrevealed outcome data.
 */
import type * as cardPack from '../games/cardPack.ts';
import type * as coinStreak from '../games/coinStreak.ts';
import type * as dailySummon from '../games/dailySummon.ts';
import type * as gardenOfChance from '../games/gardenOfChance.ts';
import type * as gemBreaker from '../games/gemBreaker.ts';
import type * as luckyFishing from '../games/luckyFishing.ts';
import type * as luckyNumber from '../games/luckyNumber.ts';
import type * as threeChests from '../games/threeChests.ts';
import type * as wishingWell from '../games/wishingWell.ts';
import type { GameId } from '../catalog.ts';
import type { LuckLabel } from '../luck.ts';
import type { PersonalBoard } from '../board.ts';
import type { ItemType } from '../collections.ts';

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

/** One request to the game service (the Edge Function's JSON body). */
export type ServiceRequest =
  | { op: 'snapshot' }
  | { op: 'addPick'; game: GameId }
  | { op: 'removePick'; game: GameId }
  | { op: 'movePick'; from: number; to: number }
  | { op: 'swapPick'; out: GameId; into: GameId }
  | { op: 'clearBoard' }
  | { op: 'start'; game: GameId; input?: StartInput }
  | { op: 'act'; game: GameId; action: GameAction }
  | { op: 'saveProgress'; game: GameId; progress: Progress }
  | { op: 'finish'; game: GameId }
  | { op: 'markViewed'; items: { type: ItemType; itemId: string }[] };

export interface ServiceResponse {
  snapshot: Snapshot;
  /** The affected game's session, for start / act / finish. */
  session?: GameSession;
}
