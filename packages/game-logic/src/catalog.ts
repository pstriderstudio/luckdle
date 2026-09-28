/** Game catalog: stable identifiers, display names, and board categories. */
import { type Rng } from './rng.ts';
import { evaluateDice, rollDice } from './games/dice.ts';
import { evaluatePack, openPack } from './games/cardPack.ts';
import { evaluateSummon, summon } from './games/dailySummon.ts';
import { cast, evaluateCatch } from './games/luckyFishing.ts';
import { evaluateCoinStreak, generateRun } from './games/coinStreak.ts';
import { dropStar, evaluateFallingStar } from './games/fallingStar.ts';
import { evaluateChests, fillChests } from './games/threeChests.ts';
import { evaluateWish, tossCoin, WISHES } from './games/wishingWell.ts';
import { breakGeode, evaluateGem } from './games/gemBreaker.ts';
import { alignRings, evaluateCosmic } from './games/cosmicAlignment.ts';
import { evaluateLuckyNumber, REFERENCE_GUESS_COUNTS } from './games/luckyNumber.ts';
import { evaluateBloom, plantSeed } from './games/gardenOfChance.ts';
import { pickWeighted } from './rng.ts';

export const GAME_IDS = [
  'lucky-number',
  'coin-streak',
  'dice-of-destiny',
  'mystery-card-pack',
  'daily-summon',
  'three-chests',
  'lucky-fishing',
  'gem-breaker',
  'garden-of-chance',
  'falling-star',
  'cosmic-alignment',
  'wishing-well',
] as const;
export type GameId = (typeof GAME_IDS)[number];

export const BOARD_IDS = ['arena', 'vault', 'wilds', 'night-sky'] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export interface GameInfo {
  id: GameId;
  name: string;
  board: BoardId;
  /** One-line placeholder panel text (never a result). */
  tagline: string;
}

export interface BoardInfo {
  id: BoardId;
  /** Placeholder name. */
  name: string;
  games: GameId[];
}

export const GAMES: Record<GameId, GameInfo> = {
  'lucky-number': { id: 'lucky-number', name: 'Lucky Number', board: 'arena', tagline: 'Find the secret number in as few guesses as you can.' },
  'coin-streak': { id: 'coin-streak', name: 'Coin Streak', board: 'arena', tagline: 'Call every flip. Two wrong calls ends the run.' },
  'dice-of-destiny': { id: 'dice-of-destiny', name: 'Dice of Destiny', board: 'arena', tagline: 'One tap, five dice, no rerolls.' },
  'mystery-card-pack': { id: 'mystery-card-pack', name: 'Mystery Card Pack', board: 'vault', tagline: 'Tear open a 12-card pack.' },
  'daily-summon': { id: 'daily-summon', name: 'Daily Summon', board: 'vault', tagline: 'Charge the portal for a 10-pull.' },
  'three-chests': { id: 'three-chests', name: 'Three Chests', board: 'vault', tagline: 'Pick one of three chests.' },
  'lucky-fishing': { id: 'lucky-fishing', name: 'Lucky Fishing', board: 'wilds', tagline: 'One cast. What will bite?' },
  'gem-breaker': { id: 'gem-breaker', name: 'Gem Breaker', board: 'wilds', tagline: 'Three strikes to crack the geode.' },
  'garden-of-chance': { id: 'garden-of-chance', name: 'Garden of Chance', board: 'wilds', tagline: 'Plant a mystery seed and water it.' },
  'falling-star': { id: 'falling-star', name: 'Falling Star', board: 'night-sky', tagline: 'Make a wish on a falling star.' },
  'cosmic-alignment': { id: 'cosmic-alignment', name: 'Cosmic Alignment', board: 'night-sky', tagline: 'Watch the Sun, Moon, and Star settle.' },
  'wishing-well': { id: 'wishing-well', name: 'The Wishing Well', board: 'night-sky', tagline: 'Toss a coin and make a wish.' },
};

export const BOARDS: Record<BoardId, BoardInfo> = {
  arena: { id: 'arena', name: 'The Arena', games: ['lucky-number', 'coin-streak', 'dice-of-destiny'] },
  vault: { id: 'vault', name: 'The Vault', games: ['mystery-card-pack', 'daily-summon', 'three-chests'] },
  wilds: { id: 'wilds', name: 'The Wilds', games: ['lucky-fishing', 'gem-breaker', 'garden-of-chance'] },
  'night-sky': { id: 'night-sky', name: 'The Night Sky', games: ['falling-star', 'cosmic-alignment', 'wishing-well'] },
};

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value);
}

const referenceGuesses = Object.keys(REFERENCE_GUESS_COUNTS).map(Number);
const referenceWeights = referenceGuesses.map((g) => REFERENCE_GUESS_COUNTS[g]);

/**
 * Samples one game's luck score as a simulated player would get it. Used for
 * the simulated field and calibration checks, never for official results.
 * Lucky Number uses the reference careful player.
 */
export const SAMPLE_SCORE: Record<GameId, (rng: Rng) => number> = {
  'lucky-number': (rng) => evaluateLuckyNumber(referenceGuesses[pickWeighted(rng, referenceWeights)]).score,
  'coin-streak': (rng) => evaluateCoinStreak(generateRun(rng)).score,
  'dice-of-destiny': (rng) => evaluateDice(rollDice(rng)).score,
  'mystery-card-pack': (rng) => evaluatePack(openPack(rng)).score,
  'daily-summon': (rng) => evaluateSummon(summon(rng)).score,
  'three-chests': (rng) => evaluateChests(fillChests(rng), rng.int(3)).score,
  'lucky-fishing': (rng) => evaluateCatch(cast(rng)).score,
  'gem-breaker': (rng) => evaluateGem(breakGeode(rng)).score,
  'garden-of-chance': (rng) => evaluateBloom(plantSeed(rng)).score,
  'falling-star': (rng) => evaluateFallingStar(dropStar(rng)).score,
  'cosmic-alignment': (rng) => evaluateCosmic(alignRings(rng)).score,
  'wishing-well': (rng) => evaluateWish(tossCoin(rng, WISHES[rng.int(WISHES.length)])).score,
};
