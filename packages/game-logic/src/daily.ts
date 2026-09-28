/** Daily luck score, percentile comparison, daily label, streaks, and the share card. */
import { GAME_IDS, type GameId, SAMPLE_SCORE } from './catalog.ts';
import { LUCK_LABELS, type LuckLabel } from './luck.ts';
import { shiftGameDay } from './gameDay.ts';
import type { Rng } from './rng.ts';

export const GAMES_PER_DAY = 5;
/** Below this many finished players, compare against a simulated field instead. */
export const MIN_LIVE_COHORT = 20;
export const SIMULATED_FIELD_SIZE = 1000;
/** Consecutive game days needed for card-pack new-card priority. */
export const NEW_CARD_PRIORITY_STREAK = 7;

/** Daily luck score: the average of the five game scores (0–100). */
export function dailyScore(gameScores: readonly number[]): number {
  if (gameScores.length !== GAMES_PER_DAY) throw new Error(`A daily score needs ${GAMES_PER_DAY} game scores`);
  return gameScores.reduce((s, x) => s + x, 0) / GAMES_PER_DAY;
}

/** Share of other players with a lower daily score, plus half of ties (0–100). */
export function percentile(score: number, others: readonly number[]): number {
  if (others.length === 0) return 50;
  let below = 0;
  let ties = 0;
  for (const o of others) {
    if (o < score) below++;
    else if (o === score) ties++;
  }
  return (100 * (below + ties / 2)) / others.length;
}

/** Daily label by percentile quintile: top 20% Charmed … bottom 20% Jinxed. */
export function dailyLabel(percentileRank: number): LuckLabel {
  return LUCK_LABELS[Math.min(4, Math.max(0, Math.floor(percentileRank / 20)))];
}

/** A simulated field of daily scores: each simulated player picks five distinct games. */
export function simulatedField(rng: Rng, size = SIMULATED_FIELD_SIZE): number[] {
  const scores: number[] = [];
  for (let p = 0; p < size; p++) {
    const pool: GameId[] = [...GAME_IDS];
    const picks: number[] = [];
    for (let i = 0; i < GAMES_PER_DAY; i++) {
      const [game] = pool.splice(rng.int(pool.length), 1);
      picks.push(SAMPLE_SCORE[game](rng));
    }
    scores.push(dailyScore(picks));
  }
  return scores;
}

export const LABEL_SQUARES: Record<LuckLabel, string> = {
  Jinxed: '🟥',
  Unlucky: '🟧',
  'Fair Luck': '🟨',
  Lucky: '🟩',
  Charmed: '🟪',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Wordle-style share text, e.g. “Luckdle · 28 Sep · 78 Lucky 🟪🟩🟨🟩🟥”. */
export function shareCard(input: {
  gameDay: string;
  dailyScore: number;
  dailyLabel: LuckLabel;
  gameLabels: readonly LuckLabel[];
}): string {
  const [, m, d] = input.gameDay.split('-').map(Number);
  const squares = input.gameLabels.map((l) => LABEL_SQUARES[l]).join('');
  return `Luckdle · ${d} ${MONTHS[m - 1]} · ${Math.round(input.dailyScore)} ${input.dailyLabel} ${squares}`;
}

/**
 * Consecutive game days, ending on `endingOn`, on which the player completed
 * at least one official game.
 */
export function streakLength(playedDays: Iterable<string>, endingOn: string): number {
  const days = new Set(playedDays);
  let length = 0;
  let day = endingOn;
  while (days.has(day)) {
    length++;
    day = shiftGameDay(day, -1);
  }
  return length;
}

/**
 * Whether a card pack opened today gets new-card priority. Opening the pack
 * is itself an official game today, so today counts toward the streak.
 */
export function newCardPriorityActive(playedDays: Iterable<string>, today: string): boolean {
  const days = new Set(playedDays);
  days.add(today);
  return streakLength(days, today) >= NEW_CARD_PRIORITY_STREAK;
}
