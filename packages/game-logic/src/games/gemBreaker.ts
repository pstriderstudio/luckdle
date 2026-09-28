/** Gem Breaker: three strikes open a geode; mineral tier × size × purity, rarest find ranks highest. */
import { type CollectibleItem, itemsOfTier, placeholderPool } from '../items.ts';
import type { LuckResult } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';
import { type FindSpec, findTable, lookupFind } from './rarityFind.ts';

export const GEM_TIERS = ['Hollow', 'Common', 'Uncommon', 'Rare', 'Precious', 'Mythic'] as const;
export type GemTier = (typeof GEM_TIERS)[number];
export const GEM_SIZES = ['Chip', 'Small', 'Medium', 'Large', 'Giant'] as const;
export const GEM_PURITIES = ['Cloudy', 'Clear', 'Brilliant', 'Flawless'] as const;

export const GEM_SPEC: FindSpec = {
  tierWeights: [15, 42, 25, 12, 5, 1],
  dimensions: [
    [45, 32, 17, 5, 1],
    [60, 30, 9, 1],
  ],
};

export interface Mineral extends CollectibleItem<GemTier> {
  /** Placeholder carat range. */
  minCarats: number;
  maxCarats: number;
}

export const MINERALS: Mineral[] = placeholderPool<GemTier>('gem', 'Mineral', [
  ['Common', 10],
  ['Uncommon', 8],
  ['Rare', 6],
  ['Precious', 4],
  ['Mythic', 2],
]).map((m) => ({ ...m, minCarats: 1, maxCarats: 50 }));

export type GemOutcome =
  | { kind: 'hollow' }
  | { kind: 'mineral'; mineralId: string; tier: GemTier; size: number; purity: number; carats: number };

export function breakGeode(rng: Rng): GemOutcome {
  const tier = pickWeighted(rng, GEM_SPEC.tierWeights);
  if (tier === 0) return { kind: 'hollow' };
  const mineral = pickOne(rng, itemsOfTier(MINERALS, GEM_TIERS[tier]));
  const size = pickWeighted(rng, GEM_SPEC.dimensions[0]);
  const purity = pickWeighted(rng, GEM_SPEC.dimensions[1]);
  const band = (mineral.maxCarats - mineral.minCarats) / GEM_SIZES.length;
  const hundredths = Math.max(Math.round(band * 100), 1);
  const carats = (Math.round((mineral.minCarats + band * size) * 100) + rng.int(hundredths)) / 100;
  return { kind: 'mineral', mineralId: mineral.id, tier: GEM_TIERS[tier], size, purity, carats };
}

let table: ReturnType<typeof findTable> | undefined;
export function gemTable() {
  return (table ??= findTable(GEM_SPEC));
}

export function evaluateGem(outcome: GemOutcome): LuckResult {
  const key =
    outcome.kind === 'hollow'
      ? { tier: 0, attributes: [] }
      : { tier: GEM_TIERS.indexOf(outcome.tier), attributes: [outcome.size, outcome.purity] };
  const group = lookupFind(gemTable(), GEM_SPEC, key);
  const exact = group.outcomes.find((o) => o.tier === key.tier) ?? group.outcomes[0];
  return { score: group.score, label: group.label, probability: exact.weight / (100 * 100 * 100) };
}
