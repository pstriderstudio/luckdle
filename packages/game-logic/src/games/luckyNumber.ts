/**
 * Lucky Number: guess a secret number from 0–9999. Each guess gets higher /
 * lower / correct, and digits in the correct position are revealed. Scored
 * against a simulated careful player, not live players.
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

/** Guesses the reference player needs for a secret. */
export function referenceGuesses(secret: number): number {
  const d = digitCount(secret);
  const s = String(secret);
  let candidates: number[] = [];
  for (let n = 0; n <= MAX_SECRET; n++) if (digitCount(n) === d) candidates.push(n);
  for (let count = 1; ; count++) {
    const guess = candidates[Math.floor((candidates.length - 1) / 2)];
    if (guess === secret) return count;
    const g = String(guess);
    const higher = secret > guess;
    candidates = candidates.filter((n) => {
      if (higher ? n <= guess : n >= guess) return false;
      const ns = String(n);
      for (let i = 0; i < d; i++) if (g[i] === s[i] && ns[i] !== s[i]) return false;
      return true;
    });
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

export function evaluateLuckyNumber(guessCount: number): LuckResult {
  if (!Number.isInteger(guessCount) || guessCount < 1) throw new Error('Invalid guess count');
  if (guessCount > MAX_REFERENCE) return { score: 0, label: 'Jinxed', probability: 0 };
  const entry = labelByGuesses.get(guessCount)!;
  return { score: entry.score, label: entry.label, probability: entry.probability };
}
