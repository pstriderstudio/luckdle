/**
 * Lucky Number: guess a secret number from 0–9999. Each guess gets higher /
 * lower / correct, and digits in the correct position are revealed. Scored
 * against recent real players, or a simulated careful player until there are
 * enough plays.
 */
import { type LuckLabel, type LuckResult, rankOutcomes } from '../luck.ts';
import type { Rng } from '../rng.ts';

export const MAX_SECRET = 9999;

/**
 * Reference guess counts (out of all 10,000 secrets) for a careful player who
 * always guesses the middle (lower middle) of the numbers still consistent
 * with the digit count, higher/lower hints, and revealed digits. Regenerate
 * with {@link simulateReferenceCounts}; a test keeps them in sync.
 */
export const REFERENCE_GUESS_COUNTS: Readonly<Record<number, number>> = {
  1: 4, 2: 38, 3: 250, 4: 786, 5: 1401, 6: 2139, 7: 2017,
  8: 1370, 9: 1137, 10: 478, 11: 238, 12: 130, 13: 12,
};

export type GuessFeedback = 'higher' | 'lower' | 'correct';

export interface LuckyNumberState {
  secret: number;
  guesses: number[];
}

export interface GuessResult {
  feedback: GuessFeedback;
  /** Revealed digit per position (null = hidden), accumulated over all guesses so far. */
  revealed: (string | null)[];
}

export function digitCount(n: number): number {
  return String(n).length;
}

export function newSecret(rng: Rng): number {
  return rng.int(MAX_SECRET + 1);
}

/** Validates that a guess has the secret's digit count. */
export function isValidGuess(secret: number, guess: number): boolean {
  return Number.isInteger(guess) && guess >= 0 && guess <= MAX_SECRET && digitCount(guess) === digitCount(secret);
}

export function revealedDigits(secret: number, guesses: readonly number[]): (string | null)[] {
  const s = String(secret);
  const revealed: (string | null)[] = Array(s.length).fill(null);
  for (const guess of guesses) {
    const g = String(guess);
    for (let i = 0; i < s.length; i++) if (g[i] === s[i]) revealed[i] = s[i];
  }
  return revealed;
}

/** Applies one guess (already validated) and returns feedback. The secret never leaves the server. */
export function checkGuess(state: LuckyNumberState, guess: number): GuessResult {
  if (!isValidGuess(state.secret, guess)) throw new Error('Guess must have the same number of digits as the secret');
  if (state.guesses.includes(state.secret)) throw new Error('Already solved');
  state.guesses.push(guess);
  const feedback: GuessFeedback = guess === state.secret ? 'correct' : state.secret > guess ? 'higher' : 'lower';
  return { feedback, revealed: revealedDigits(state.secret, state.guesses) };
}

/** The lowest and highest numbers with this many digits (1 digit: 0–9). */
export function digitRange(digits: number): { min: number; max: number } {
  return { min: digits === 1 ? 0 : 10 ** (digits - 1), max: 10 ** digits - 1 };
}

export interface GuessHint {
  guess: number;
  feedback: GuessFeedback;
}

/**
 * Whether a number is still possible given the digit count, higher/lower
 * hints, and revealed digits: the information the reference player uses.
 */
export function isPossible(n: number, digits: number, hints: readonly GuessHint[], revealed: readonly (string | null)[]): boolean {
  if (digitCount(n) !== digits) return false;
  for (const { guess, feedback } of hints) {
    if (feedback === 'correct' ? n !== guess : feedback === 'higher' ? n <= guess : n >= guess) return false;
  }
  const ns = String(n);
  for (let i = 0; i < revealed.length; i++) if (revealed[i] !== null && ns[i] !== revealed[i]) return false;
  return true;
}

/** Guesses the reference player needs for a secret. */
export function referenceGuesses(secret: number): number {
  const d = digitCount(secret);
  const { min, max } = digitRange(d);
  let candidates: number[] = [];
  for (let n = min; n <= max; n++) candidates.push(n);
  const hints: GuessHint[] = [];
  for (let count = 1; ; count++) {
    const guess = candidates[Math.floor((candidates.length - 1) / 2)];
    if (guess === secret) return count;
    hints.push({ guess, feedback: secret > guess ? 'higher' : 'lower' });
    const revealed = revealedDigits(secret, hints.map((h) => h.guess));
    candidates = candidates.filter((n) => isPossible(n, d, hints, revealed));
  }
}

/** Re-runs the reference simulation over all 10,000 secrets. */
export function simulateReferenceCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let secret = 0; secret <= MAX_SECRET; secret++) {
    const g = referenceGuesses(secret);
    counts[g] = (counts[g] ?? 0) + 1;
  }
  return counts;
}

const TOTAL = MAX_SECRET + 1;
const MAX_REFERENCE = Math.max(...Object.keys(REFERENCE_GUESS_COUNTS).map(Number));

/** Label per guess count, from per-game cut-offs over the reference distribution. */
const labelByGuesses = (() => {
  const outcomes = Object.entries(REFERENCE_GUESS_COUNTS).map(([g, c]) => ({ value: Number(g), probability: c / TOTAL }));
  const groups = rankOutcomes(outcomes, (a, b) => b - a); // more guesses = less lucky
  return new Map<number, { score: number; label: LuckLabel; probability: number }>(
    groups.map((g) => [g.outcomes[0], { score: g.score, label: g.label, probability: g.probability }]),
  );
})();

/** Mean guesses of the reference player (6.8). */
export const REFERENCE_MEAN =
  Object.entries(REFERENCE_GUESS_COUNTS).reduce((s, [g, c]) => s + Number(g) * c, 0) / TOTAL;

/** Scores a guess count against the simulated careful player (the fallback reference). */
export function evaluateLuckyNumber(guessCount: number): LuckResult {
  if (!Number.isInteger(guessCount) || guessCount < 1) throw new Error('Invalid guess count');
  if (guessCount > MAX_REFERENCE) return { score: 0, label: 'Jinxed', probability: 0 };
  const entry = labelByGuesses.get(guessCount)!;
  return { score: entry.score, label: entry.label, probability: entry.probability };
}

// ---------------------------------------------------------------------------
// Scoring against real players (TODO.md: Lucky Number scoring decision, option B)

/** Past game days whose completed plays form the reference (today is excluded, so scores are fixed at play time). */
export const REFERENCE_WINDOW_DAYS = 30;
/** Below this many reference plays, the simulated careful player is used instead. */
export const MIN_PLAYER_REFERENCE = 200;

/** Guess count → number of plays. */
export type GuessCounts = Readonly<Record<number, number>>;

export interface LuckyNumberScoring extends LuckResult {
  /** Mean guesses of the reference used. */
  mean: number;
  source: 'players' | 'simulation';
  /** Plays in the reference (10,000 for the simulation: one per secret). */
  plays: number;
}

function totalOf(counts: GuessCounts): number {
  return Object.values(counts).reduce((s, c) => s + c, 0);
}

/**
 * Scores a guess count against any reference distribution of guess counts:
 * 100 × (share needing more guesses + ½ share needing the same), with label
 * cut-offs chosen over that distribution as for every other game.
 */
export function evaluateAgainst(counts: GuessCounts, guessCount: number): LuckResult {
  if (!Number.isInteger(guessCount) || guessCount < 1) throw new Error('Invalid guess count');
  const total = totalOf(counts);
  if (total <= 0) throw new Error('Empty reference');
  const maxGuesses = Math.max(MAX_REFERENCE, guessCount, ...Object.keys(counts).map(Number));
  const outcomes = Array.from({ length: maxGuesses }, (_, i) => ({ value: i + 1, probability: (counts[i + 1] ?? 0) / total }));
  const groups = rankOutcomes(outcomes, (a, b) => b - a); // more guesses = less lucky
  const group = groups.find((g) => g.outcomes[0] === guessCount)!;
  return { score: group.score, label: group.label, probability: group.probability };
}

/**
 * Scores a solved game against recent real players' guess counts when there
 * are at least MIN_PLAYER_REFERENCE of them, otherwise against the simulated
 * careful player. The result is stored with the game, so it never changes.
 */
export function scoreLuckyNumber(guessCount: number, playerCounts: GuessCounts = {}): LuckyNumberScoring {
  const plays = totalOf(playerCounts);
  const usePlayers = plays >= MIN_PLAYER_REFERENCE;
  const counts = usePlayers ? playerCounts : REFERENCE_GUESS_COUNTS;
  const total = totalOf(counts);
  const mean = Object.entries(counts).reduce((s, [g, c]) => s + Number(g) * c, 0) / total;
  const result = usePlayers ? evaluateAgainst(counts, guessCount) : evaluateLuckyNumber(guessCount);
  return { ...result, mean, source: usePlayers ? 'players' : 'simulation', plays: total };
}
