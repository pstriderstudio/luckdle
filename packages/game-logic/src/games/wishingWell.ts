/**
 * The Wishing Well: choose a wish theme, toss a coin, receive an object.
 * The wish only picks the theme; odds are identical for every wish.
 */
import type { CollectibleItem } from '../items.ts';
import type { LuckResult, RankedGroup } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';
import { evaluateTier, tierTable } from './tierGame.ts';

export const WISHES = ['Fortune', 'Love', 'Adventure', 'Wisdom', 'Mischief'] as const;
export type Wish = (typeof WISHES)[number];
export const WELL_TIERS = ['Soggy', 'Ordinary', 'Curious', 'Enchanted', 'Wondrous', 'Legendary'] as const;
export type WellTier = (typeof WELL_TIERS)[number];
/** Percent odds per tier. */
export const WELL_ODDS = [25, 22, 20, 17, 13, 3] as const;

export interface Curio extends CollectibleItem<WellTier> {
  wish: Wish;
}

/** 60 placeholder curios: 5 wishes × 6 tiers × 2 objects. */
export const CURIOS: Curio[] = WISHES.flatMap((wish, w) =>
  WELL_TIERS.flatMap((tier, t) =>
    [1, 2].map((n) => ({
      id: `curio-${String(w * 12 + t * 2 + n).padStart(3, '0')}`,
      tier,
      wish,
      name: `${tier} ${wish} Curio ${n}`,
    })),
  ),
);

export interface WishingWellOutcome {
  wish: Wish;
  curioId: string;
  tier: WellTier;
}

export function tossCoin(rng: Rng, wish: Wish): WishingWellOutcome {
  if (!WISHES.includes(wish)) throw new Error('Unknown wish');
  const tier = WELL_TIERS[pickWeighted(rng, WELL_ODDS)];
  const curio = pickOne(rng, CURIOS.filter((c) => c.wish === wish && c.tier === tier));
  return { wish, curioId: curio.id, tier };
}

let table: RankedGroup<WellTier>[] | undefined;
export function wishingWellTable() {
  return (table ??= tierTable(WELL_TIERS, WELL_ODDS));
}

export function evaluateWish(outcome: WishingWellOutcome): LuckResult {
  return evaluateTier(wishingWellTable(), outcome.tier);
}
