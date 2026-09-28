import { describe, expect, it } from 'vitest';
import {
  checkGuess,
  evaluateLuckyNumber,
  isValidGuess,
  REFERENCE_GUESS_COUNTS,
  REFERENCE_MEAN,
  possibleRange,
  referenceGuesses,
  revealedDigits,
  simulateReferenceCounts,
} from '../src/games/luckyNumber.ts';
import { seededRng } from '../src/rng.ts';

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

  it('shows the full range for the digit count before any guess', () => {
    const none = (d: number) => possibleRange(d, [], Array(d).fill(null));
    expect([1, 2, 3, 4].map(none)).toEqual([
      { min: 0, max: 9 },
      { min: 10, max: 99 },
      { min: 100, max: 999 },
      { min: 1000, max: 9999 },
    ]);
  });

  it('narrows the range with hints and revealed digits, always keeping the secret inside', () => {
    const hints = (secret: number, guesses: number[]) =>
      guesses.map((guess) => ({ guess, feedback: secret > guess ? ('higher' as const) : ('lower' as const) }));
    expect(possibleRange(4, hints(4827, [5000, 4000, 4527]), revealedDigits(4827, [5000, 4000, 4527]))).toEqual({ min: 4627, max: 4927 });

    const rng = seededRng(21);
    for (let i = 0; i < 300; i++) {
      const secret = rng.int(10000);
      const d = String(secret).length;
      const guesses: number[] = [];
      for (let k = 0; k < 4; k++) {
        const g = (d === 1 ? 0 : 10 ** (d - 1)) + rng.int(d === 1 ? 10 : 9 * 10 ** (d - 1));
        if (g !== secret) guesses.push(g);
      }
      const r = possibleRange(d, hints(secret, guesses), revealedDigits(secret, guesses));
      expect(r.min).toBeLessThanOrEqual(secret);
      expect(r.max).toBeGreaterThanOrEqual(secret);
    }
  });
});
