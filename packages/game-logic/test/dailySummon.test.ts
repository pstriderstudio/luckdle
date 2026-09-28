import { describe, expect, it } from 'vitest';
import { CHARACTERS, evaluateSummon, STAR_TIERS, summon, summonTable } from '../src/games/dailySummon.ts';
import { seededRng } from '../src/rng.ts';
import { expectLabelPercents } from './helpers.ts';

const stars = (s: string) => s.split('').map(Number);

describe('Daily Summon', () => {
  it('has 935 distinct outcomes', () => {
    expect(summonTable()).toHaveLength(935);
  });

  it('has a 5★ in about 17.8% of summons, all Charmed', () => {
    const withFive = summonTable().filter((g) => g.outcomes[0][0] === 5);
    expect(withFive.reduce((s, g) => s + g.probability, 0)).toBeCloseTo(1 - 0.99 ** 9 * 0.9, 12);
    expect(withFive.every((g) => g.label === 'Charmed')).toBe(true);
  });

  it('confirms the label cut-offs by exact search', () => {
    // TODO.md's preliminary 0.5%-grid cut-offs, confirmed exactly.
    expectLabelPercents(summonTable(), [19.1, 18.3, 20.9, 20.8, 20.8], 1);
    const firstOfLabel = new Map<string, string>();
    for (const g of summonTable()) if (!firstOfLabel.has(g.label)) firstOfLabel.set(g.label, g.outcomes[0].join(''));
    expect(firstOfLabel.get('Jinxed')).toBe('4111111111');
    expect(firstOfLabel.get('Charmed')).toBe('4443222111');
  });

  it('has the most common outcome 4★ 3★ 2★ 2★ 2★ 1★…', () => {
    const top = [...summonTable()].sort((a, b) => b.probability - a.probability)[0];
    expect(top.outcomes[0]).toEqual(stars('4322211111'));
    expect(top.probability * 100).toBeCloseTo(5.36, 2);
  });

  it('has the agreed roster sizes', () => {
    expect(STAR_TIERS.map((t) => CHARACTERS.filter((c) => c.tier === t).length)).toEqual([20, 15, 12, 8, 5]);
  });

  it('guarantees 4★ or better on the tenth pull and skips owned 1★–3★ reveals', () => {
    const rng = seededRng(2);
    const owned = new Set(CHARACTERS.map((c) => c.id));
    for (let i = 0; i < 200; i++) {
      const s = summon(rng, owned);
      expect(s.pulls).toHaveLength(10);
      expect(s.pulls[9].stars).toBeGreaterThanOrEqual(4);
      for (const p of s.pulls) expect(p.skipReveal).toBe(p.stars <= 3);
      expect(evaluateSummon(s).label).toBeDefined();
    }
  });
});
