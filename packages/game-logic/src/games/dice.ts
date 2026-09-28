/** Dice of Destiny: five fair d6 rolled once; rarer combinations are luckier. */
import { type LuckResult, type RankedGroup, rankOutcomes } from '../luck.ts';
import type { Rng } from '../rng.ts';

/** Combinations, lowest luck first. No combination is deliberately lowest. */
export const DICE_COMBINATIONS = [
  'No combination',
  'One pair',
  'Two pairs',
  'Three of a kind',
  'Full house',
  'Five-dice straight',
  'Four of a kind',
  'Five of a kind',
] as const;
export type DiceCombination = (typeof DICE_COMBINATIONS)[number];

export interface DiceOutcome {
  dice: [number, number, number, number, number];
}

export function classifyDice(dice: readonly number[]): DiceCombination {
  if (dice.length !== 5 || dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
    throw new Error('Dice of Destiny needs five values from 1 to 6');
  }
  const counts = new Map<number, number>();
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
  const shape = [...counts.values()].sort((a, b) => b - a).join('');
  switch (shape) {
    case '5': return 'Five of a kind';
    case '41': return 'Four of a kind';
    case '32': return 'Full house';
    case '311': return 'Three of a kind';
    case '221': return 'Two pairs';
    case '2111': return 'One pair';
    default: {
      const sorted = [...dice].sort((a, b) => a - b).join('');
      return sorted === '12345' || sorted === '23456' ? 'Five-dice straight' : 'No combination';
    }
  }
}

let table: RankedGroup<DiceCombination>[] | undefined;

/** Exact table from all 7,776 ordered rolls. */
export function diceTable(): RankedGroup<DiceCombination>[] {
  if (table) return table;
  const counts = new Map<DiceCombination, number>();
  const dice = [1, 1, 1, 1, 1];
  for (let i = 0; i < 7776; i++) {
    let n = i;
    for (let j = 0; j < 5; j++) {
      dice[j] = (n % 6) + 1;
      n = Math.floor(n / 6);
    }
    const c = classifyDice(dice);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  table = rankOutcomes(
    DICE_COMBINATIONS.map((c) => ({ value: c, probability: (counts.get(c) ?? 0) / 7776 })),
    (a, b) => DICE_COMBINATIONS.indexOf(a) - DICE_COMBINATIONS.indexOf(b),
  );
  return table;
}

export function rollDice(rng: Rng): DiceOutcome {
  return { dice: [0, 0, 0, 0, 0].map(() => rng.int(6) + 1) as DiceOutcome['dice'] };
}

export function evaluateDice(outcome: DiceOutcome): LuckResult & { combination: DiceCombination } {
  const combination = classifyDice(outcome.dice);
  const group = diceTable().find((g) => g.outcomes[0] === combination)!;
  return { combination, score: group.score, label: group.label, probability: group.probability };
}
