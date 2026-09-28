import { describe, expect, it } from 'vitest';
import {
  checkGuess,
  evaluateAgainst,
  evaluateLuckyNumber,
  isValidGuess,
  MIN_PLAYER_REFERENCE,
  scoreLuckyNumber,
  REFERENCE_GUESS_COUNTS,
  REFERENCE_MEAN,
  referenceGuesses,
  simulateReferenceCounts,
} from '../src/games/luckyNumber.ts';

describe('Lucky Number', () => {
  it('reference counts match a fresh simulation over all 10,000 numbers', () => {
    expect(simulateReferenceCounts()).toEqual(REFERENCE_GUESS_COUNTS);
    expect(REFERENCE_MEAN).toBeCloseTo(6.8, 1);
  }, 60_000);

  it('matches the agreed score table', () => {
    const rows: [number, number, string][] = [
      [1, 99.98, 'Charmed'],
      [2, 99.77, 'Charmed'],
      [3, 98.33, 'Charmed'],
      [4, 93.15, 'Charmed'],
      [5, 82.21, 'Charmed'],
      [6, 64.52, 'Lucky'],
      [7, 43.73, 'Fair Luck'],
      [8, 26.8, 'Unlucky'],
      [9, 14.27, 'Jinxed'],
      [13, 0.06, 'Jinxed'],
      [14, 0, 'Jinxed'],
      [40, 0, 'Jinxed'],
    ];
    for (const [guesses, score, label] of rows) {
      const r = evaluateLuckyNumber(guesses);
      expect(r.score).toBeCloseTo(score, 1);
      expect(r.label).toBe(label);
    }
  });

  it('scoring against the reference counts gives the same results as the simulation table', () => {
    for (let g = 1; g <= 20; g++) {
      const a = evaluateAgainst(REFERENCE_GUESS_COUNTS, g);
      const b = evaluateLuckyNumber(g);
      expect(a.score).toBeCloseTo(b.score, 9);
      expect(a.label).toBe(b.label);
    }
  });

  it('the average player scores 50 against any player distribution', () => {
    const counts = { 3: 10, 4: 40, 5: 80, 6: 50, 8: 20, 12: 5 };
    const total = 205;
    const mean = Object.entries(counts).reduce((s, [g, c]) => s + evaluateAgainst(counts, Number(g)).score * c, 0) / total;
    expect(mean).toBeCloseTo(50, 9);
    expect(evaluateAgainst(counts, 7).score).toBeCloseTo(100 * 25 / 205, 9); // unseen count: between 6 and 8
    expect(evaluateAgainst(counts, 20).score).toBe(0);
  });

  it('uses real players only once there are enough plays', () => {
    const few = scoreLuckyNumber(5, { 5: MIN_PLAYER_REFERENCE - 1 });
    expect(few.source).toBe('simulation');
    expect(few.score).toBeCloseTo(evaluateLuckyNumber(5).score, 9);
    expect(few.mean).toBeCloseTo(REFERENCE_MEAN, 9);
    const enough = scoreLuckyNumber(5, { 4: 100, 6: 100 });
    expect(enough).toMatchObject({ source: 'players', plays: 200, mean: 5, score: 50 });
  });

  it('gives higher/lower feedback and keeps correct digits revealed', () => {
    const state = { secret: 4827, guesses: [] as number[] };
    expect(checkGuess(state, 5000)).toEqual({ feedback: 'lower', revealed: [null, null, null, null] });
    expect(checkGuess(state, 4000)).toEqual({ feedback: 'higher', revealed: ['4', null, null, null] });
    expect(checkGuess(state, 4527)).toEqual({ feedback: 'higher', revealed: ['4', null, '2', '7'] });
    expect(checkGuess(state, 4827).feedback).toBe('correct');
    expect(() => checkGuess(state, 4827)).toThrow();
  });

  it('requires guesses with the secret’s digit count', () => {
    expect(isValidGuess(42, 17)).toBe(true);
    expect(isValidGuess(42, 7)).toBe(false);
    expect(isValidGuess(42, 107)).toBe(false);
    expect(isValidGuess(0, 5)).toBe(true);
  });

  it('the reference player solves one number per digit length in one guess', () => {
    expect([4, 54, 549, 5499].map(referenceGuesses)).toEqual([1, 1, 1, 1]);
  });
});
