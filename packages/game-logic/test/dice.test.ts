import { describe, expect, it } from 'vitest';
import { classifyDice, diceTable, evaluateDice, rollDice } from '../src/games/dice.ts';
import { seededRng } from '../src/rng.ts';
import { expectLabelPercents } from './helpers.ts';

// From TODO.md “Combination probabilities” (enumeration of all 7,776 rolls).
const EXPECTED: [string, number, number, string][] = [
  ['No combination', 480, 3.1, 'Jinxed'],
  ['One pair', 3600, 29.3, 'Unlucky'],
  ['Two pairs', 1800, 64.0, 'Fair Luck'],
  ['Three of a kind', 1200, 83.3, 'Lucky'],
  ['Full house', 300, 93.0, 'Charmed'],
  ['Five-dice straight', 240, 96.5, 'Charmed'],
  ['Four of a kind', 150, 99.0, 'Charmed'],
  ['Five of a kind', 6, 99.96, 'Charmed'],
];

describe('Dice of Destiny', () => {
  it('matches the enumerated combination table', () => {
    const table = diceTable();
    expect(table.map((g) => g.outcomes[0])).toEqual(EXPECTED.map((e) => e[0]));
    table.forEach((g, i) => {
      const [, count, score, label] = EXPECTED[i];
      expect(g.probability * 7776).toBeCloseTo(count, 6);
      expect(g.score).toBeCloseTo(score, score === 99.96 ? 2 : 1);
      expect(g.label).toBe(label);
    });
  });

  it('has the agreed label frequencies', () => {
    expectLabelPercents(diceTable(), [6.17, 46.3, 23.15, 15.43, 8.95]);
  });

  it('only counts five-dice straights', () => {
    expect(classifyDice([1, 2, 3, 4, 5])).toBe('Five-dice straight');
    expect(classifyDice([6, 5, 4, 3, 2])).toBe('Five-dice straight');
    expect(classifyDice([1, 2, 3, 4, 6])).toBe('No combination');
    expect(classifyDice([3, 3, 2, 2, 2])).toBe('Full house');
    expect(classifyDice([1, 2, 3, 4, 4])).toBe('One pair');
  });

  it('rolls five valid dice and evaluates them', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 100; i++) {
      const roll = rollDice(rng);
      expect(roll.dice).toHaveLength(5);
      expect(evaluateDice(roll).combination).toBe(classifyDice(roll.dice));
    }
  });
});
