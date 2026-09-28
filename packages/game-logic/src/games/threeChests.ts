/**
 * Three Chests: three independently filled chests; the player picks one.
 * Luck = the picked treasure's tier, then how many of the other two it beats.
 * Contents must not reach the browser before the pick.
 */
import { type LuckResult, type RankedGroup, rankOutcomes } from '../luck.ts';
import { pickWeighted, type Rng } from '../rng.ts';

export const TREASURES = ['Cobwebs', 'Copper', 'Silver', 'Gold', 'Jewels', 'Relic'] as const;
export type Treasure = (typeof TREASURES)[number];
/** Percent odds per chest. */
export const TREASURE_ODDS = [25, 30, 22, 14, 7, 2] as const;

export interface ChestsOutcome {
  chests: [Treasure, Treasure, Treasure];
}

export interface ChestResultKey {
  tier: number;
  beaten: number;
}

export function fillChests(rng: Rng): ChestsOutcome {
  return {
    chests: [0, 1, 2].map(() => TREASURES[pickWeighted(rng, TREASURE_ODDS)]) as ChestsOutcome['chests'],
  };
}

export function pickResult(outcome: ChestsOutcome, pick: number): ChestResultKey {
  if (![0, 1, 2].includes(pick)) throw new Error('Pick must be 0, 1, or 2');
  const tier = TREASURES.indexOf(outcome.chests[pick]);
  const beaten = outcome.chests.filter((c, i) => i !== pick && TREASURES.indexOf(c) < tier).length;
  return { tier, beaten };
}

const compare = (a: ChestResultKey, b: ChestResultKey) => a.tier - b.tier || a.beaten - b.beaten;

let table: RankedGroup<ChestResultKey>[] | undefined;
export function chestsTable(): RankedGroup<ChestResultKey>[] {
  if (table) return table;
  const outcomes: { value: ChestResultKey; probability: number }[] = [];
  let lower = 0;
  for (let tier = 0; tier < TREASURES.length; tier++) {
    const p = TREASURE_ODDS[tier] / 100;
    const q = lower; // chance another chest is strictly lower
    const binomial = [(1 - q) ** 2, 2 * q * (1 - q), q ** 2];
    for (let beaten = 0; beaten <= 2; beaten++) {
      if (binomial[beaten] > 0) outcomes.push({ value: { tier, beaten }, probability: p * binomial[beaten] });
    }
    lower += p;
  }
  table = rankOutcomes(outcomes, compare);
  return table;
}

export function evaluateChests(outcome: ChestsOutcome, pick: number): LuckResult & ChestResultKey {
  const key = pickResult(outcome, pick);
  const group = chestsTable().find((g) => compare(g.outcomes[0], key) === 0)!;
  return { ...key, score: group.score, label: group.label, probability: group.probability };
}
