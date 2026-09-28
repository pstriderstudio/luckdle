import { describe, expect, it } from 'vitest';
import { correctCalls, evaluateStreak, flipFace, generateRun, streakProbability } from '../src/games/coinStreak.ts';
import { dropStar, evaluateFallingStar, fallingStarTable, slotWidths, STAR_SLOTS } from '../src/games/fallingStar.ts';
import { chestsTable, evaluateChests, fillChests, TREASURES } from '../src/games/threeChests.ts';
import { CURIOS, evaluateWish, tossCoin, wishingWellTable } from '../src/games/wishingWell.ts';
import { rankOutcomes } from '../src/luck.ts';
import { seededRng } from '../src/rng.ts';
import { expectLabelPercents } from './helpers.ts';

describe('Coin Streak', () => {
  const rows: [number, number, number, string][] = [
    [0, 25, 12.5, 'Jinxed'],
    [1, 25, 37.5, 'Unlucky'],
    [2, 18.75, 59.38, 'Fair Luck'],
    [3, 12.5, 75.0, 'Lucky'],
    [4, 7.81, 85.16, 'Charmed'],
    [5, 4.69, 91.41, 'Charmed'],
    [7, 1.56, 97.27, 'Charmed'],
    [10, 0.27, 99.55, 'Charmed'],
  ];

  it('matches the agreed table', () => {
    for (const [k, percent, score, label] of rows) {
      const r = evaluateStreak(k);
      expect(r.probability * 100).toBeCloseTo(percent, 1);
      expect(r.score).toBeCloseTo(score, 1);
      expect(r.label).toBe(label);
    }
  });

  it('closed-form score equals the shared ranking of the distribution', () => {
    const outcomes = Array.from({ length: 80 }, (_, k) => ({ value: k, probability: streakProbability(k) }));
    const tail = 1 - outcomes.reduce((s, o) => s + o.probability, 0);
    outcomes.push({ value: 80, probability: tail });
    const groups = rankOutcomes(outcomes, (a, b) => a - b, (g) => g.map((_, i) => Math.min(i, 4)));
    for (let k = 0; k < 30; k++) expect(groups[k].score).toBeCloseTo(evaluateStreak(k).score, 9);
  });

  it('runs end on the second miss and flips match or miss the call', () => {
    const rng = seededRng(6);
    for (let i = 0; i < 200; i++) {
      const run = generateRun(rng);
      expect(run.hits.filter((h) => !h)).toHaveLength(2);
      expect(run.hits[run.hits.length - 1]).toBe(false);
      run.hits.forEach((hit, j) => expect(flipFace(run, j, 'heads')).toBe(hit ? 'heads' : 'tails'));
      expect(correctCalls(run)).toBe(run.hits.length - 2);
    }
  });
});

describe('Falling Star', () => {
  it('matches agreed scores and labels', () => {
    const t = fallingStarTable();
    expect(t.map((g) => g.score)).toEqual([12.5, 36, 57, 75, 90, 98.5].map((x) => expect.closeTo(x, 9)));
    expect(t.map((g) => g.label)).toEqual(['Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Charmed', 'Charmed']);
  });

  it('slot widths equal their probabilities', () => {
    const w = slotWidths();
    expect(w).toHaveLength(11);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    expect(w[5]).toBeCloseTo(0.03, 12);
    expect(STAR_SLOTS[5]).toBe('Supernova');
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) expect(evaluateFallingStar(dropStar(rng)).score).toBeGreaterThan(0);
  });
});

describe('The Wishing Well', () => {
  it('matches agreed scores and labels', () => {
    const t = wishingWellTable();
    expect(t.map((g) => g.score)).toEqual([12.5, 36, 57, 75.5, 90.5, 98.5].map((x) => expect.closeTo(x, 9)));
    expectLabelPercents(t, [25, 22, 20, 17, 16]);
  });

  it('has 60 curios themed to the chosen wish', () => {
    expect(CURIOS).toHaveLength(60);
    expect(new Set(CURIOS.map((c) => c.id)).size).toBe(60);
    const rng = seededRng(3);
    for (let i = 0; i < 100; i++) {
      const o = tossCoin(rng, 'Mischief');
      expect(CURIOS.find((c) => c.id === o.curioId)?.wish).toBe('Mischief');
      expect(evaluateWish(o).score).toBeGreaterThan(0);
    }
  });
});

describe('Three Chests', () => {
  const rows: [string, number, number, number, string][] = [
    ['Relic', 2, 1.921, 99.04, 'Charmed'],
    ['Relic', 0, 0.001, 98.0, 'Charmed'],
    ['Jewels', 2, 5.797, 95.1, 'Charmed'],
    ['Gold', 1, 4.959, 80.22, 'Charmed'],
    ['Gold', 0, 0.741, 77.37, 'Lucky'],
    ['Silver', 1, 10.89, 64.9, 'Lucky'],
    ['Silver', 0, 4.455, 57.23, 'Fair Luck'],
    ['Copper', 1, 11.25, 47.5, 'Fair Luck'],
    ['Copper', 0, 16.875, 33.44, 'Unlucky'],
    ['Cobwebs', 0, 25, 12.5, 'Jinxed'],
  ];

  it('matches the agreed table', () => {
    const t = chestsTable();
    expect(t).toHaveLength(16);
    for (const [treasure, beaten, percent, score, label] of rows) {
      const g = t.find((x) => TREASURES[x.outcomes[0].tier] === treasure && x.outcomes[0].beaten === beaten)!;
      expect(g.probability * 100).toBeCloseTo(percent, 2);
      expect(g.score).toBeCloseTo(score, 1);
      expect(g.label).toBe(label);
    }
    expectLabelPercents(t, [25.0, 16.9, 17.6, 18.3, 22.3], 1);
  });

  it('counts only strictly lower chests as beaten', () => {
    const outcome = { chests: ['Gold', 'Gold', 'Copper'] as ['Gold', 'Gold', 'Copper'] };
    expect(evaluateChests(outcome, 0).beaten).toBe(1);
    expect(evaluateChests(outcome, 2).beaten).toBe(0);
    const rng = seededRng(10);
    for (let i = 0; i < 100; i++) expect(evaluateChests(fillChests(rng), i % 3).score).toBeGreaterThan(0);
  });
});
