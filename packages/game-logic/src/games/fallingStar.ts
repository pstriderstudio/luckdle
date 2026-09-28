/**
 * Falling Star: a wished star falls through pegs into a funnel of 11 slots
 * whose widths match their odds; the narrow centre (Supernova) is rarest.
 */
import type { LuckResult, RankedGroup } from '../luck.ts';
import { pickWeighted, type Rng } from '../rng.ts';
import { evaluateTier, tierTable } from './tierGame.ts';

export const STAR_TIERS = ['Dust', 'Spark', 'Glimmer', 'Shine', 'Radiant', 'Supernova'] as const;
export type StarTier = (typeof STAR_TIERS)[number];
/** Per-mille odds per tier (split evenly between a tier's two slots). */
export const STAR_ODDS = [250, 220, 200, 160, 140, 30] as const;

/** The 11 slots, left to right. */
export const STAR_SLOTS: readonly StarTier[] = [
  'Dust', 'Spark', 'Glimmer', 'Shine', 'Radiant', 'Supernova', 'Radiant', 'Shine', 'Glimmer', 'Spark', 'Dust',
];

/** Each slot's width as a share of the board (equal to its probability). */
export function slotWidths(): number[] {
  return STAR_SLOTS.map((tier) => {
    const i = STAR_TIERS.indexOf(tier);
    return STAR_ODDS[i] / 1000 / (tier === 'Supernova' ? 1 : 2);
  });
}

export interface FallingStarOutcome {
  /** Index into STAR_SLOTS. */
  slot: number;
  /** Where the star enters along the top, 0–1 (presentation only). */
  entry: number;
}

export function dropStar(rng: Rng): FallingStarOutcome {
  const tier = STAR_TIERS[pickWeighted(rng, STAR_ODDS)];
  const slots = STAR_SLOTS.flatMap((t, i) => (t === tier ? [i] : []));
  return { slot: slots[rng.int(slots.length)], entry: rng.float() };
}

let table: RankedGroup<StarTier>[] | undefined;
export function fallingStarTable() {
  return (table ??= tierTable(STAR_TIERS, STAR_ODDS));
}

export function evaluateFallingStar(outcome: FallingStarOutcome): LuckResult & { tier: StarTier } {
  const tier = STAR_SLOTS[outcome.slot];
  if (!tier) throw new Error('Invalid slot');
  return { ...evaluateTier(fallingStarTable(), tier), tier };
}
