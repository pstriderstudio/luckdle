/**
 * Cosmic Alignment: three rings settle on their own; luck is the spread, the
 * narrowest arc containing the Sun, Moon, and Star markers (smaller is luckier).
 */
import { LUCK_LABELS, type LuckLabel, type LuckResult } from '../luck.ts';
import type { Rng } from '../rng.ts';

export interface CosmicOutcome {
  /** Final marker angles in degrees [Sun, Moon, Star], each in [0, 360). */
  angles: [number, number, number];
}

export function alignRings(rng: Rng): CosmicOutcome {
  return { angles: [0, 1, 2].map(() => rng.float() * 360) as CosmicOutcome['angles'] };
}

/** Narrowest arc (degrees) containing all markers: 360° minus the largest gap. */
export function spreadOf(angles: readonly number[]): number {
  const sorted = angles.map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
  let largestGap = 360 - sorted[sorted.length - 1] + sorted[0];
  for (let i = 1; i < sorted.length; i++) largestGap = Math.max(largestGap, sorted[i] - sorted[i - 1]);
  return 360 - largestGap;
}

/** P(spread ≤ degrees) for three independent uniform markers. */
export function spreadCdf(degrees: number): number {
  const x = Math.min(Math.max(degrees / 360, 0), 2 / 3);
  return x <= 0.5 ? 3 * x * x : 3 * x * x - 3 * (2 * x - 1) ** 2;
}

/** Spread in degrees at which P(spread ≤ s) = p (inverse of {@link spreadCdf}). */
export function spreadQuantile(p: number): number {
  if (p <= 0.75) return 360 * Math.sqrt(p / 3);
  // 9x² − 12x + 3 + p = 0, root in (½, ⅔].
  return (360 * (12 - Math.sqrt(144 - 36 * (3 + p)))) / 18;
}

/** Upper spread bounds for Charmed, Lucky, Fair Luck, Unlucky (20% each). */
export const LABEL_SPREAD_BOUNDS = [0.2, 0.4, 0.6, 0.8].map(spreadQuantile);

export function flavourName(spread: number): string {
  if (spread <= 5) return 'Grand Alignment';
  if (spread <= 30) return 'Aligned';
  if (spread <= 93) return 'Converging';
  if (spread <= 161) return 'Drifting';
  return 'Scattered';
}

export function evaluateCosmic(outcome: CosmicOutcome): LuckResult & { spread: number; flavour: string } {
  const spread = spreadOf(outcome.angles);
  const p = spreadCdf(spread);
  const bucket = LABEL_SPREAD_BOUNDS.findIndex((bound) => spread <= bound);
  const label: LuckLabel = LUCK_LABELS[bucket === -1 ? 0 : 4 - bucket];
  return { spread, flavour: flavourName(spread), score: 100 * (1 - p), label, probability: p };
}
