import { expect } from 'vitest';
import { type LuckLabel, labelFrequencies } from '../src/luck.ts';

/** Asserts label frequencies (in percent, Jinxed first) to a given number of decimals. */
export function expectLabelPercents(
  groups: { probability: number; label: LuckLabel }[],
  percents: [number, number, number, number, number],
  decimals = 2,
): void {
  const freq = Object.values(labelFrequencies(groups)).map((p) => p * 100);
  freq.forEach((value, i) => expect(value).toBeCloseTo(percents[i], decimals - 1));
}
