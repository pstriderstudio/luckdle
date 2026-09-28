/**
 * Personal daily board rules: up to five picks; unplayed picks can be
 * swapped or removed; a game locks when its result is generated; yesterday's
 * picks carry over unplayed.
 */
import type { GameId } from './catalog.ts';
import { GAMES_PER_DAY } from './daily.ts';

export interface BoardSlot {
  game: GameId;
  played: boolean;
}

/** Slots in display order; length ≤ 5. */
export type PersonalBoard = BoardSlot[];

export function addPick(board: PersonalBoard, game: GameId): PersonalBoard {
  if (board.some((s) => s.game === game)) throw new Error('That game is already on your board');
  if (board.length >= GAMES_PER_DAY) throw new Error(`Your board already has ${GAMES_PER_DAY} games`);
  return [...board, { game, played: false }];
}

export function removePick(board: PersonalBoard, game: GameId): PersonalBoard {
  const slot = board.find((s) => s.game === game);
  if (!slot) throw new Error('That game is not on your board');
  if (slot.played) throw new Error('Played games are locked for today');
  return board.filter((s) => s.game !== game);
}

export function swapPick(board: PersonalBoard, out: GameId, into: GameId): PersonalBoard {
  const index = board.findIndex((s) => s.game === out);
  if (index === -1) throw new Error('That game is not on your board');
  if (board[index].played) throw new Error('Played games are locked for today');
  if (board.some((s) => s.game === into)) throw new Error('That game is already on your board');
  return board.map((s, i) => (i === index ? { game: into, played: false } : s));
}

/** Drag-to-rearrange: moves a slot to a new position. */
export function moveSlot(board: PersonalBoard, from: number, to: number): PersonalBoard {
  if (from < 0 || from >= board.length || to < 0 || to >= board.length) throw new Error('Invalid position');
  const next = [...board];
  const [slot] = next.splice(from, 1);
  next.splice(to, 0, slot);
  return next;
}

export function markPlayed(board: PersonalBoard, game: GameId): PersonalBoard {
  if (!board.some((s) => s.game === game)) throw new Error('Only games on your board can be played');
  return board.map((s) => (s.game === game ? { ...s, played: true } : s));
}

/** Today's board from yesterday's: same picks and order, all unplayed. */
export function carryOver(yesterday: PersonalBoard): PersonalBoard {
  return yesterday.map((s) => ({ game: s.game, played: false }));
}

/** Clear board: removes every unplayed pick (played games stay locked). */
export function clearBoard(board: PersonalBoard): PersonalBoard {
  return board.filter((s) => s.played);
}

export function allPlayed(board: PersonalBoard): boolean {
  return board.length === GAMES_PER_DAY && board.every((s) => s.played);
}
