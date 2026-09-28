/** Garden of Chance: plant a seed; tier × stacking mutations, rarest bloom ranks highest. */
import { type CollectibleItem, itemsOfTier, placeholderPool } from '../items.ts';
import type { LuckResult } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';
import { type FindSpec, findTable, lookupFind } from './rarityFind.ts';

export const PLANT_TIERS = ['Weed', 'Common', 'Uncommon', 'Rare', 'Exotic', 'Mythic'] as const;
export type PlantTier = (typeof PLANT_TIERS)[number];
export const MUTATIONS = ['Variegated', 'Twin Bloom', 'Luminous', 'Crystal Petals'] as const;
export type Mutation = (typeof MUTATIONS)[number];
/** Percent chance of each mutation, rolled independently. */
export const MUTATION_ODDS = [20, 8, 3, 1] as const;

export const GARDEN_SPEC: FindSpec = {
  tierWeights: [15, 35, 25, 15, 8, 2],
  // Each mutation is a yes/no dimension: [absent, present].
  dimensions: MUTATION_ODDS.map((p) => [100 - p, p]),
};

export const PLANTS: CollectibleItem<PlantTier>[] = placeholderPool<PlantTier>('plant', 'Plant', [
  ['Weed', 3],
  ['Common', 12],
  ['Uncommon', 10],
  ['Rare', 8],
  ['Exotic', 6],
  ['Mythic', 4],
]);

export type GardenOutcome =
  | { kind: 'weed'; plantId: string }
  | { kind: 'flower'; plantId: string; tier: PlantTier; mutations: Mutation[] };

export function plantSeed(rng: Rng): GardenOutcome {
  const tier = pickWeighted(rng, GARDEN_SPEC.tierWeights);
  const plant = pickOne(rng, itemsOfTier(PLANTS, PLANT_TIERS[tier]));
  if (tier === 0) return { kind: 'weed', plantId: plant.id };
  const mutations = MUTATIONS.filter((_, i) => rng.int(100) < MUTATION_ODDS[i]);
  return { kind: 'flower', plantId: plant.id, tier: PLANT_TIERS[tier], mutations };
}

let table: ReturnType<typeof findTable> | undefined;
export function gardenTable() {
  return (table ??= findTable(GARDEN_SPEC));
}

export function evaluateBloom(outcome: GardenOutcome): LuckResult {
  const key =
    outcome.kind === 'weed'
      ? { tier: 0, attributes: [] }
      : {
          tier: PLANT_TIERS.indexOf(outcome.tier),
          attributes: MUTATIONS.map((m) => (outcome.mutations.includes(m) ? 1 : 0)),
        };
  const group = lookupFind(gardenTable(), GARDEN_SPEC, key);
  const exact =
    group.outcomes.find((o) => o.tier === key.tier && o.attributes.join() === key.attributes.join()) ??
    group.outcomes[0];
  return { score: group.score, label: group.label, probability: exact.weight / (100 * 100 ** 4) };
}
