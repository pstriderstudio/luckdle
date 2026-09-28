/** Shared table for games with a single ranked tier (Falling Star, The Wishing Well). */
import { type LuckResult, type RankedGroup, rankOutcomes } from '../luck.ts';

export function tierTable<T extends string>(tiers: readonly T[], weights: readonly number[]): RankedGroup<T>[] {
  const total = weights.reduce((s, w) => s + w, 0);
  return rankOutcomes(
    tiers.map((t, i) => ({ value: t, probability: weights[i] / total })),
    (a, b) => tiers.indexOf(a) - tiers.indexOf(b),
  );
}

export function evaluateTier<T extends string>(table: RankedGroup<T>[], tier: T): LuckResult {
  const group = table.find((g) => g.outcomes[0] === tier);
  if (!group) throw new Error(`Unknown tier ${tier}`);
  return { score: group.score, label: group.label, probability: group.probability };
}
