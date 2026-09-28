import { describe, expect, it } from 'vitest';
import { cast, evaluateCatch, fishingTable, FISHING_POOL } from '../src/games/luckyFishing.ts';
import { breakGeode, evaluateGem, gemTable, MINERALS } from '../src/games/gemBreaker.ts';
import { evaluateBloom, gardenTable, plantSeed, PLANTS } from '../src/games/gardenOfChance.ts';
import { seededRng } from '../src/rng.ts';
import { expectLabelPercents } from './helpers.ts';

describe('Lucky Fishing', () => {
  it('has the agreed label frequencies', () => {
    expectLabelPercents(fishingTable(), [15.0, 17.8, 22.6, 21.9, 22.7], 1);
  });

  it('ranks rarer exact catches higher (examples from TODO.md)', () => {
    const golden = evaluateCatch({ kind: 'fish', speciesId: 'x', type: 'Common', sizeClass: 4, trait: 3, length: 1 });
    const mythic = evaluateCatch({ kind: 'fish', speciesId: 'x', type: 'Mythic', sizeClass: 0, trait: 0, length: 1 });
    expect(Math.round(1 / golden.probability)).toBe(22222);
    expect(Math.round(1 / mythic.probability)).toBe(505);
    expect(golden.score).toBeGreaterThan(mythic.score);
  });

  it('puts junk lowest and any traited fish in Charmed', () => {
    expect(evaluateCatch({ kind: 'junk', itemId: 'fish-001' }).label).toBe('Jinxed');
    expect(evaluateCatch({ kind: 'fish', speciesId: 'x', type: 'Common', sizeClass: 0, trait: 1, length: 1 }).label).toBe('Charmed');
    expect(evaluateCatch({ kind: 'fish', speciesId: 'x', type: 'Rare', sizeClass: 1, trait: 0, length: 1 }).label).toBe('Charmed');
    expect(evaluateCatch({ kind: 'fish', speciesId: 'x', type: 'Common', sizeClass: 0, trait: 0, length: 1 }).label).toBe('Unlucky');
  });

  it('has 37 species and 5 junk items and generates valid catches', () => {
    expect(FISHING_POOL.filter((f) => f.tier !== 'Junk')).toHaveLength(37);
    expect(FISHING_POOL.filter((f) => f.tier === 'Junk')).toHaveLength(5);
    const rng = seededRng(4);
    for (let i = 0; i < 500; i++) {
      const c = cast(rng);
      if (c.kind === 'fish') {
        const band = (120 - 20) / 5;
        expect(c.length).toBeGreaterThanOrEqual(20 + band * c.sizeClass);
        expect(c.length).toBeLessThan(20 + band * (c.sizeClass + 1));
      }
      expect(evaluateCatch(c).score).toBeGreaterThan(0);
    }
  });
});

describe('Gem Breaker', () => {
  it('has the agreed label frequencies', () => {
    expectLabelPercents(gemTable(), [15.0, 19.4, 21.5, 21.7, 22.3], 1);
  });

  it('starts Charmed at a clear Rare chip', () => {
    expect(evaluateGem({ kind: 'mineral', mineralId: 'x', tier: 'Rare', size: 0, purity: 1, carats: 1 }).label).toBe('Charmed');
    expect(evaluateGem({ kind: 'hollow' }).label).toBe('Jinxed');
    expect(evaluateGem({ kind: 'mineral', mineralId: 'x', tier: 'Common', size: 1, purity: 0, carats: 1 }).label).toBe('Unlucky');
  });

  it('has 30 minerals and generates valid finds', () => {
    expect(MINERALS).toHaveLength(30);
    const rng = seededRng(8);
    for (let i = 0; i < 500; i++) expect(evaluateGem(breakGeode(rng)).score).toBeGreaterThan(0);
  });
});

describe('Garden of Chance', () => {
  it('has the agreed label frequencies', () => {
    expectLabelPercents(gardenTable(), [15.0, 24.7, 17.7, 22.4, 20.2], 1);
  });

  it('labels blooms as agreed', () => {
    const bloom = (tier: 'Common' | 'Uncommon' | 'Rare' | 'Exotic', mutations: ('Variegated' | 'Luminous')[] = []) =>
      evaluateBloom({ kind: 'flower', plantId: 'x', tier, mutations }).label;
    expect(evaluateBloom({ kind: 'weed', plantId: 'plant-001' }).label).toBe('Jinxed');
    expect(bloom('Common')).toBe('Unlucky');
    expect(bloom('Uncommon')).toBe('Fair Luck');
    expect(bloom('Rare')).toBe('Lucky');
    expect(bloom('Common', ['Variegated'])).toBe('Lucky');
    expect(bloom('Exotic')).toBe('Lucky');
    expect(bloom('Uncommon', ['Variegated'])).toBe('Charmed');
  });

  it('has about 29% of flowers with at least one mutation', () => {
    expect(1 - 0.8 * 0.92 * 0.97 * 0.99).toBeCloseTo(0.29, 2);
    expect(PLANTS).toHaveLength(43);
    const rng = seededRng(12);
    for (let i = 0; i < 500; i++) expect(evaluateBloom(plantSeed(rng)).score).toBeGreaterThan(0);
  });
});
