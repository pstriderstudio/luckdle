/**
 * Shared ranking for “rarest exact find” games (Lucky Fishing, Gem Breaker,
 * Garden of Chance): a find is a tier plus independent attributes, ranked by
 * the probability of that exact combination (rarer is luckier, equal
 * probabilities tie). Tier 0 is the dud tier (junk, hollow geode, weed),
 * which has no attributes and is always lowest.
 *
 * Weights are integers so equal probabilities compare exactly.
 */
import { type RankedGroup, rankOutcomes } from '../luck.ts';

export interface FindKey {
  /** Tier index; 0 is the dud tier. */
  tier: number;
  /** One index per attribute dimension (empty for the dud tier). */
  attributes: number[];
}

export interface FindSpec {
  /** Integer weights per tier, dud tier first. */
  tierWeights: readonly number[];
  /** Integer weights per attribute dimension. */
  dimensions: readonly (readonly number[])[];
}

interface WeightedKey extends FindKey {
  /** Integer weight on a common scale. */
  weight: number;
}

function scale(spec: FindSpec): { tierTotal: number; dimTotals: number[]; total: number } {
  const tierTotal = spec.tierWeights.reduce((s, w) => s + w, 0);
  const dimTotals = spec.dimensions.map((d) => d.reduce((s, w) => s + w, 0));
  return { tierTotal, dimTotals, total: dimTotals.reduce((p, t) => p * t, tierTotal) };
}

export function findWeight(spec: FindSpec, key: FindKey): number {
  const { dimTotals } = scale(spec);
  if (key.tier === 0) return dimTotals.reduce((p, t) => p * t, spec.tierWeights[0]);
  return key.attributes.reduce((p, a, i) => p * spec.dimensions[i][a], spec.tierWeights[key.tier]);
}

/** Lowest luck first: the dud tier, then more probable finds before rarer ones. */
export function compareFinds(a: WeightedKey, b: WeightedKey): number {
  if (a.tier === 0 || b.tier === 0) return (a.tier === 0 ? 0 : 1) - (b.tier === 0 ? 0 : 1);
  return b.weight - a.weight;
}

export function findTable(spec: FindSpec): RankedGroup<WeightedKey>[] {
  const { total } = scale(spec);
  if (!Number.isSafeInteger(total)) throw new Error('Weights too large for exact comparison');
  const outcomes: { value: WeightedKey; probability: number }[] = [];
  const dud: WeightedKey = { tier: 0, attributes: [], weight: 0 };
  dud.weight = findWeight(spec, dud);
  outcomes.push({ value: dud, probability: dud.weight / total });
  for (let tier = 1; tier < spec.tierWeights.length; tier++) {
    const combos: number[][] = [[]];
    for (const dim of spec.dimensions) {
      const next: number[][] = [];
      for (const c of combos) for (let i = 0; i < dim.length; i++) next.push([...c, i]);
      combos.splice(0, combos.length, ...next);
    }
    for (const attributes of combos) {
      const key: WeightedKey = { tier, attributes, weight: 0 };
      key.weight = findWeight(spec, key);
      if (key.weight > 0) outcomes.push({ value: key, probability: key.weight / total });
    }
  }
  return rankOutcomes(outcomes, compareFinds);
}

export function lookupFind(
  table: RankedGroup<WeightedKey>[],
  spec: FindSpec,
  key: FindKey,
): RankedGroup<WeightedKey> {
  const probe: WeightedKey = { ...key, weight: findWeight(spec, key) };
  const group = table.find((g) => compareFinds(g.outcomes[0], probe) === 0);
  if (!group) throw new Error('Invalid find');
  return group;
}
