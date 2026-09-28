/** Lucky Fishing: one cast; catch type × size class × trait, rarest exact catch ranks highest. */
import { type CollectibleItem, itemsOfTier, placeholderPool } from '../items.ts';
import type { LuckResult } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';
import { type FindSpec, findTable, lookupFind } from './rarityFind.ts';

export const CATCH_TYPES = ['Junk', 'Common', 'Uncommon', 'Rare', 'Legendary', 'Mythic'] as const;
export type CatchType = (typeof CATCH_TYPES)[number];
export const SIZE_CLASSES = ['Small', 'Medium', 'Large', 'Huge', 'Colossal'] as const;
export const TRAIT_LEVELS = ['Plain', 'Marked', 'Strange', 'Wondrous'] as const;
/** Placeholder trait names per level (writing remains). */
export const TRAIT_NAMES = ['Plain', 'Spotted', 'Glowing', 'Golden'] as const;

export const FISHING_SPEC: FindSpec = {
  tierWeights: [150, 450, 250, 110, 35, 5], // per mille
  dimensions: [
    [45, 32, 17, 5, 1], // size, percent
    [88, 8, 3, 1], // trait, percent
  ],
};

export interface Species extends CollectibleItem<CatchType> {
  /** Placeholder length range in centimetres. */
  minLength: number;
  maxLength: number;
}

export const FISHING_POOL: Species[] = placeholderPool<CatchType>('fish', 'Catch', [
  ['Junk', 5],
  ['Common', 12],
  ['Uncommon', 10],
  ['Rare', 8],
  ['Legendary', 5],
  ['Mythic', 2],
]).map((item) => ({ ...item, minLength: 20, maxLength: 120 }));

export type FishingOutcome =
  | { kind: 'junk'; itemId: string }
  | {
      kind: 'fish';
      speciesId: string;
      type: CatchType;
      /** Index into SIZE_CLASSES. */
      sizeClass: number;
      /** Index into TRAIT_LEVELS. */
      trait: number;
      /** Length in centimetres, one decimal place. */
      length: number;
    };

/** Size classes are equal-width bands of the species' length range, smallest first. */
export function lengthInClass(rng: Rng, species: Species, sizeClass: number): number {
  const band = (species.maxLength - species.minLength) / SIZE_CLASSES.length;
  const tenths = Math.round(band * 10);
  const start = Math.round((species.minLength + band * sizeClass) * 10);
  return (start + rng.int(Math.max(tenths, 1))) / 10;
}

export function cast(rng: Rng): FishingOutcome {
  const tier = pickWeighted(rng, FISHING_SPEC.tierWeights);
  const type = CATCH_TYPES[tier];
  const item = pickOne(rng, itemsOfTier(FISHING_POOL, type));
  if (tier === 0) return { kind: 'junk', itemId: item.id };
  const sizeClass = pickWeighted(rng, FISHING_SPEC.dimensions[0]);
  const trait = pickWeighted(rng, FISHING_SPEC.dimensions[1]);
  return { kind: 'fish', speciesId: item.id, type, sizeClass, trait, length: lengthInClass(rng, item, sizeClass) };
}

let table: ReturnType<typeof findTable> | undefined;
export function fishingTable() {
  return (table ??= findTable(FISHING_SPEC));
}

export function evaluateCatch(outcome: FishingOutcome): LuckResult {
  const key =
    outcome.kind === 'junk'
      ? { tier: 0, attributes: [] }
      : { tier: CATCH_TYPES.indexOf(outcome.type), attributes: [outcome.sizeClass, outcome.trait] };
  const group = lookupFind(fishingTable(), FISHING_SPEC, key);
  const exact = group.outcomes.find((o) => o.tier === key.tier) ?? group.outcomes[0];
  return { score: group.score, label: group.label, probability: exact.weight / (1000 * 100 * 100) };
}
