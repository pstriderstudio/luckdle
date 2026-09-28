import { describe, expect, it } from 'vitest';
import { BOARDS, GAME_IDS, GAMES, SAMPLE_SCORE } from '../src/catalog.ts';
import {
  dailyLabel,
  dailyScore,
  newCardPriorityActive,
  percentile,
  shareCard,
  simulatedField,
  streakLength,
} from '../src/daily.ts';
import { addPick, allPlayed, carryOver, clearBoard, markPlayed, moveSlot, removePick, swapPick } from '../src/board.ts';
import { seededRng } from '../src/rng.ts';

describe('catalog', () => {
  it('puts every game on exactly one board of three', () => {
    const onBoards = Object.values(BOARDS).flatMap((b) => b.games);
    expect(onBoards.sort()).toEqual([...GAME_IDS].sort());
    for (const b of Object.values(BOARDS)) {
      expect(b.games).toHaveLength(3);
      for (const g of b.games) expect(GAMES[g].board).toBe(b.id);
    }
  });

  it('every game has an expected score of 50', () => {
    const rng = seededRng(2026);
    for (const id of GAME_IDS) {
      let sum = 0;
      const n = 20000;
      for (let i = 0; i < n; i++) sum += SAMPLE_SCORE[id](rng);
      expect(sum / n, id).toBeGreaterThan(48.5);
      expect(sum / n, id).toBeLessThan(51.5);
    }
  });
});

describe('daily score and comparison', () => {
  it('averages five game scores', () => {
    expect(dailyScore([10, 20, 30, 40, 50])).toBe(30);
    expect(() => dailyScore([1, 2, 3])).toThrow();
  });

  it('percentile counts lower scores plus half of ties', () => {
    expect(percentile(50, [10, 50, 50, 90])).toBe(50);
    expect(percentile(95, [10, 20, 30, 40])).toBe(100);
  });

  it('labels by quintile', () => {
    expect([0, 19.9, 20, 45, 60, 79.9, 80, 100].map(dailyLabel)).toEqual([
      'Jinxed', 'Jinxed', 'Unlucky', 'Fair Luck', 'Lucky', 'Lucky', 'Charmed', 'Charmed',
    ]);
  });

  it('simulated field centres on 50', () => {
    const field = simulatedField(seededRng(1), 2000);
    const mean = field.reduce((s, x) => s + x, 0) / field.length;
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(52);
  });

  it('builds the share card', () => {
    expect(
      shareCard({
        gameDay: '2026-09-28',
        dailyScore: 78.4,
        dailyLabel: 'Lucky',
        gameLabels: ['Charmed', 'Lucky', 'Fair Luck', 'Lucky', 'Jinxed'],
      }),
    ).toBe('Luckdle · 28 Sep · 78 Lucky 🟪🟩🟨🟩🟥');
  });
});

describe('streaks', () => {
  const days = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];

  it('counts consecutive game days', () => {
    expect(streakLength(days, '2026-09-26')).toBe(7);
    expect(streakLength(days, '2026-09-27')).toBe(0);
  });

  it('activates new-card priority from the 7th consecutive day, counting today', () => {
    expect(newCardPriorityActive(days.slice(1), '2026-09-27')).toBe(true); // 6 prior days + today
    expect(newCardPriorityActive(days.slice(2), '2026-09-27')).toBe(false);
    expect(newCardPriorityActive(days.slice(0, 5), '2026-09-27')).toBe(false); // missed a day
  });
});

describe('personal board', () => {
  it('enforces five picks and locks played games', () => {
    let board = ['dice-of-destiny', 'coin-streak', 'lucky-number', 'three-chests', 'falling-star'].reduce(
      (b, g) => addPick(b, g as (typeof GAME_IDS)[number]),
      [] as ReturnType<typeof carryOver>,
    );
    expect(() => addPick(board, 'gem-breaker')).toThrow();
    expect(() => addPick(removePick(board, 'coin-streak'), 'dice-of-destiny')).toThrow();
    board = markPlayed(board, 'dice-of-destiny');
    expect(() => swapPick(board, 'dice-of-destiny', 'gem-breaker')).toThrow();
    board = swapPick(board, 'coin-streak', 'gem-breaker');
    expect(board[1].game).toBe('gem-breaker');
    board = moveSlot(board, 0, 4);
    expect(board[4].game).toBe('dice-of-destiny');
    expect(clearBoard(board)).toEqual([{ game: 'dice-of-destiny', played: true }]);
    expect(allPlayed(board)).toBe(false);
    const tomorrow = carryOver(board);
    expect(tomorrow.every((s) => !s.played)).toBe(true);
    expect(tomorrow.map((s) => s.game)).toEqual(board.map((s) => s.game));
  });
});
