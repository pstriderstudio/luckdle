import { describe, expect, it } from 'vitest';
import { gameDayOf, gameDayStart, nextReset, shiftGameDay } from '../src/gameDay.ts';

describe('game day (3:00 AM America/New_York reset)', () => {
  it('resets at 07:00 UTC during daylight time', () => {
    expect(gameDayOf(new Date('2026-09-28T06:59:59Z'))).toBe('2026-09-27');
    expect(gameDayOf(new Date('2026-09-28T07:00:00Z'))).toBe('2026-09-28');
    expect(gameDayStart('2026-09-28').toISOString()).toBe('2026-09-28T07:00:00.000Z');
  });

  it('resets at 08:00 UTC during standard time', () => {
    expect(gameDayOf(new Date('2026-12-01T07:59:59Z'))).toBe('2026-11-30');
    expect(gameDayOf(new Date('2026-12-01T08:00:00Z'))).toBe('2026-12-01');
    expect(gameDayStart('2026-12-01').toISOString()).toBe('2026-12-01T08:00:00.000Z');
  });

  it('handles daylight-saving change days', () => {
    // Spring forward (2026-03-08): 3 AM is already daylight time.
    expect(gameDayStart('2026-03-08').toISOString()).toBe('2026-03-08T07:00:00.000Z');
    expect(nextReset(new Date('2026-03-08T06:00:00Z')).toISOString()).toBe('2026-03-08T07:00:00.000Z');
    // Fall back (2026-11-01): 3 AM is standard time.
    expect(gameDayStart('2026-11-01').toISOString()).toBe('2026-11-01T08:00:00.000Z');
    expect(gameDayOf(new Date('2026-11-01T07:30:00Z'))).toBe('2026-10-31');
  });

  it('shifts across month and year boundaries', () => {
    expect(shiftGameDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftGameDay('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('next reset is always within 25 hours', () => {
    const start = Date.UTC(2026, 0, 1);
    for (let h = 0; h < 24 * 400; h += 7) {
      const now = new Date(start + h * 3600_000);
      const gap = nextReset(now).getTime() - now.getTime();
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThanOrEqual(25 * 3600_000);
    }
  });
});
