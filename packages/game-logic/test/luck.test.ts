import { describe, expect, it } from 'vitest';
import { optimalLabelCutoffs, rankOutcomes } from '../src/luck.ts';
import { pickWeighted, secureRng, seededRng } from '../src/rng.ts';

describe('shared luck score', () => {
  it('scores = share ranked below plus half of ties', () => {
    const groups = rankOutcomes(
      [
        { value: 'a', probability: 0.5 },
        { value: 'b', probability: 0.25 },
        { value: 'c', probability: 0.25 },
      ],
      (x, y) => x.localeCompare(y),
      (g) => g.map((_, i) => i),
    );
    expect(groups.map((g) => g.score)).toEqual([25, 62.5, 87.5]);
  });

  it('groups ties so equal results share a score and label', () => {
    const groups = rankOutcomes(
      [1, 2, 2, 3, 4, 5].map((v) => ({ value: v, probability: 1 / 6 })),
      (a, b) => a - b,
    );
    expect(groups).toHaveLength(5);
    expect(groups[1].outcomes).toEqual([2, 2]);
    expect(groups[1].score).toBeCloseTo(100 * (1 / 6 + 1 / 6), 10);
  });

  it('rejects distributions that do not sum to 1', () => {
    expect(() => rankOutcomes([{ value: 1, probability: 0.5 }], () => 0)).toThrow();
  });
});

describe('label cut-offs', () => {
  it('gives every label to five equal groups', () => {
    expect(optimalLabelCutoffs([0.2, 0.2, 0.2, 0.2, 0.2])).toEqual([0, 1, 2, 3, 4]);
  });

  it('uses every label, contiguously, as close to 20% as possible', () => {
    const labels = optimalLabelCutoffs([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    expect(labels).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('needs at least five distinct results', () => {
    expect(() => optimalLabelCutoffs([0.5, 0.5])).toThrow();
  });
});

describe('rng', () => {
  it('seeded rng is deterministic', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a.int(100), a.int(100), a.float()]).toEqual([b.int(100), b.int(100), b.float()]);
  });

  it('secure rng stays in range', () => {
    const rng = secureRng();
    for (let i = 0; i < 1000; i++) {
      const x = rng.int(7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
      const f = rng.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('pickWeighted follows integer weights', () => {
    const rng = seededRng(7);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[pickWeighted(rng, [1, 2, 7])]++;
    expect(counts[0] / 30000).toBeCloseTo(0.1, 1);
    expect(counts[1] / 30000).toBeCloseTo(0.2, 1);
    expect(counts[2] / 30000).toBeCloseTo(0.7, 1);
  });
});
