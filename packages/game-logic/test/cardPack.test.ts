import { describe, expect, it } from 'vitest';
import {
  CARD_RARITIES,
  CARDS,
  evaluatePack,
  openPack,
  packTable,
  podium,
  RARE,
} from '../src/games/cardPack.ts';
import { seededRng } from '../src/rng.ts';
import { expectLabelPercents } from './helpers.ts';

const ABBR = ['C', 'U', 'R', 'SR', 'UR', 'ScR'];
const variable = (profile: number[]) => {
  // Remove the fixed 6 C + 3 U to recover the guaranteed + wildcard rarities.
  const rest = [...profile];
  for (const [rarity, n] of [[0, 6], [1, 3]]) {
    for (let k = 0; k < n; k++) rest.splice(rest.lastIndexOf(rarity), 1);
  }
  return rest.map((r) => ABBR[r]).join(' / ');
};

// Selected rows of TODO.md “Pack outcomes, luck scores and labels”.
const ROWS: [string, number, number, string][] = [
  ['ScR / ScR / ScR', 0.0000005, 100.0, 'Charmed'],
  ['ScR / C / C', 0.21125, 99.41, 'Charmed'],
  ['UR / C / C', 1.90125, 94.06, 'Charmed'],
  ['SR / U / U', 1.25, 86.14, 'Charmed'],
  ['SR / U / C', 6.5, 82.27, 'Lucky'],
  ['SR / C / C', 8.45, 74.79, 'Lucky'],
  ['R / R / R', 0.3675, 70.38, 'Fair Luck'],
  ['R / U / U', 4.6875, 58.41, 'Fair Luck'],
  ['R / U / C', 24.375, 43.88, 'Unlucky'],
  ['R / C / C', 31.6875, 15.84, 'Jinxed'],
];

describe('Mystery Card Pack', () => {
  it('has 52 distinct pack outcomes', () => {
    expect(packTable()).toHaveLength(52);
  });

  it('matches the agreed outcome table', () => {
    const byKey = new Map(packTable().map((g) => [variable(g.outcomes[0]), g]));
    for (const [key, percent, score, label] of ROWS) {
      const g = byKey.get(key);
      expect(g, key).toBeDefined();
      expect(g!.probability * 100).toBeCloseTo(percent, 7);
      expect(g!.score).toBeCloseTo(score, 1);
      expect(g!.label).toBe(label);
    }
  });

  it('has the agreed label frequencies', () => {
    expectLabelPercents(packTable(), [31.69, 24.38, 14.51, 14.95, 14.48]);
  });

  it('includes at least one Secret Rare in about 1 in 143 packs', () => {
    const p = packTable()
      .filter((g) => g.outcomes[0][0] === 5)
      .reduce((s, g) => s + g.probability, 0);
    expect(p * 100).toBeCloseTo(0.6989005, 6);
  });

  it('has the agreed card list', () => {
    expect(CARDS).toHaveLength(150);
    expect(CARD_RARITIES.map((r) => CARDS.filter((c) => c.tier === r).length)).toEqual([60, 40, 25, 15, 7, 3]);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(150);
  });

  it('builds packs in slot order with a guaranteed Rare-or-better last', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 500; i++) {
      const pack = openPack(rng);
      expect(pack.cards).toHaveLength(12);
      expect(pack.cards.slice(0, 6).every((c) => c.rarity === 'Common')).toBe(true);
      expect(pack.cards.slice(6, 9).every((c) => c.rarity === 'Uncommon')).toBe(true);
      expect(CARD_RARITIES.indexOf(pack.cards[11].rarity)).toBeGreaterThanOrEqual(RARE);
      expect(podium(pack)).toHaveLength(3);
      expect(evaluatePack(pack).score).toBeGreaterThan(0);
    }
  });

  it('skips reveals only for owned or repeated cards below Rare', () => {
    const owned = new Set(CARDS.map((c) => c.id));
    const pack = openPack(seededRng(5), { owned });
    for (const card of pack.cards) {
      expect(card.isNew).toBe(false);
      expect(card.skipReveal).toBe(CARD_RARITIES.indexOf(card.rarity) < RARE);
    }
  });

  it('new-card priority picks unowned cards without changing rarities', () => {
    const rng = seededRng(9);
    const owned = new Set(CARDS.filter((c) => c.tier === 'Common').slice(0, 55).map((c) => c.id));
    const withPriority = openPack(rng, { owned, newCardPriority: true });
    const commons = withPriority.cards.filter((c) => c.rarity === 'Common');
    const unownedCommons = CARDS.filter((c) => c.tier === 'Common' && !owned.has(c.id)).map((c) => c.id);
    // 5 unowned Commons exist; the first five Common slots must use them all.
    expect(new Set(commons.slice(0, 5).map((c) => c.cardId))).toEqual(new Set(unownedCommons));
    // Same seed without priority gives the same rarities.
    const a = openPack(seededRng(21), { owned, newCardPriority: true }).cards.map((c) => c.rarity);
    const b = openPack(seededRng(21), { owned }).cards.map((c) => c.rarity);
    expect(a).toEqual(b);
  });
});
