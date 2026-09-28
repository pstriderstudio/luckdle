/**
 * The global game day. Every game day starts at 3:00 AM America/New_York
 * (following daylight saving) and is identified by the calendar date of the
 * reset that starts it, e.g. "2026-09-28".
 */

export const RESET_TIME_ZONE = 'America/New_York';
export const RESET_HOUR = 3;

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: RESET_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function wallTime(instant: Date): WallTime {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function formatDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(gameDay: string, days: number): string {
  const [y, m, d] = gameDay.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** The game day an instant belongs to. */
export function gameDayOf(instant: Date): string {
  const t = wallTime(instant);
  const today = formatDate(t.year, t.month, t.day);
  return t.hour < RESET_HOUR ? addDays(today, -1) : today;
}

/** The UTC instant at which a game day starts (3:00 AM New York time on that date). */
export function gameDayStart(gameDay: string): Date {
  const [y, m, d] = gameDay.split('-').map(Number);
  // 3 AM Eastern is 07:00 UTC in daylight time and 08:00 UTC in standard time.
  for (const utcHour of [RESET_HOUR + 4, RESET_HOUR + 5]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, utcHour));
    const t = wallTime(candidate);
    if (t.hour === RESET_HOUR && t.minute === 0 && formatDate(t.year, t.month, t.day) === gameDay) {
      return candidate;
    }
  }
  throw new Error(`Could not resolve the reset instant for ${gameDay}`);
}

/** The next reset after an instant. */
export function nextReset(instant: Date): Date {
  return gameDayStart(addDays(gameDayOf(instant), 1));
}

/** The game day after (or before, with a negative offset) another. */
export function shiftGameDay(gameDay: string, days: number): string {
  return addDays(gameDay, days);
}
