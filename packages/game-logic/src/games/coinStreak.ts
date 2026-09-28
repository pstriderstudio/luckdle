/**
 * Coin Streak: call every flip; the run ends on the second wrong call.
 * Luck = correct calls. The run is generated before the first flip; flips
 * are then shown to match or miss the player's calls.
 */
import { LUCK_LABELS, type LuckResult } from '../luck.ts';
import type { Rng } from '../rng.ts';

export const LIVES = 2;

export interface CoinStreakOutcome {
  /** Per flip: true when the player's call is correct. The last entry is the second miss. */
  hits: boolean[];
}

export type CoinFace = 'heads' | 'tails';

export function generateRun(rng: Rng): CoinStreakOutcome {
  const hits: boolean[] = [];
  let misses = 0;
  while (misses < LIVES) {
    const hit = rng.int(2) === 1;
    hits.push(hit);
    if (!hit) misses++;
  }
  return { hits };
}

export function correctCalls(outcome: CoinStreakOutcome): number {
  return outcome.hits.filter(Boolean).length;
}

/** The face shown for a flip given the player's call. */
export function flipFace(outcome: CoinStreakOutcome, flipIndex: number, call: CoinFace): CoinFace {
  const hit = outcome.hits[flipIndex];
  if (hit === undefined) throw new Error('The run has already ended');
  return hit ? call : call === 'heads' ? 'tails' : 'heads';
}

/** P(exactly k correct calls) = (k + 1) / 2^(k+2). */
export function streakProbability(k: number): number {
  return (k + 1) / 2 ** (k + 2);
}

/** Shared score = 100 × (1 − (k + 2) / 2^(k+1) + (k + 1) / 2^(k+3)). */
export function streakScore(k: number): number {
  return 100 * (1 - (k + 2) / 2 ** (k + 1) + (k + 1) / 2 ** (k + 3));
}

/** Labels: 0 Jinxed, 1 Unlucky, 2 Fair Luck, 3 Lucky, 4+ Charmed. */
export function evaluateStreak(k: number): LuckResult {
  if (!Number.isInteger(k) || k < 0) throw new Error('Invalid streak');
  return { score: streakScore(k), label: LUCK_LABELS[Math.min(k, 4)], probability: streakProbability(k) };
}

export function evaluateCoinStreak(outcome: CoinStreakOutcome): LuckResult & { correctCalls: number } {
  const k = correctCalls(outcome);
  return { ...evaluateStreak(k), correctCalls: k };
}
