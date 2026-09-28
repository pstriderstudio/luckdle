/**
 * Tarot deck and PLACEHOLDER reading content. The 468 authored
 * card/orientation/position interpretations, relationship passages, and
 * outlook values are still to be written; everything below marked
 * placeholder exists only so the ritual can be played end to end.
 */
import { type LuckLabel, type Rng, secureRng } from '@luckdle/game-logic';

const MAJOR = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers',
  'The Chariot', 'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
];
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];

export const TAROT_CARDS: string[] = [...MAJOR, ...SUITS.flatMap((suit) => RANKS.map((rank) => `${rank} of ${suit}`))];

export const POSITIONS = ['atmosphere', 'obstacle', 'guidance'] as const;
export type Position = (typeof POSITIONS)[number];

export interface DeckCard {
  card: number;
  reversed: boolean;
}

/** Uniformly shuffles all 78 cards with independent 50/50 orientations, fixed for the whole reading. */
export function newDeck(rng: Rng = secureRng()): DeckCard[] {
  const order = TAROT_CARDS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map((card) => ({ card, reversed: rng.int(2) === 1 }));
}

export function cardTitle(c: DeckCard): string {
  return `${TAROT_CARDS[c.card]}${c.reversed ? ', reversed' : ''}`;
}

const POSITION_PHRASE: Record<Position, string> = {
  atmosphere: 'sets the atmosphere',
  obstacle: 'names the obstacle',
  guidance: 'offers guidance',
};

/** Placeholder interpretation for one card in one position. */
export function interpretation(c: DeckCard, position: Position): string {
  return `${cardTitle(c)} ${POSITION_PHRASE[position]}. [Placeholder — the authored interpretation for this card, orientation, and position is still to be written.]`;
}

/** Placeholder combined reading. */
export function combinedReading(cards: DeckCard[]): { title: string; text: string } {
  const [a, o, g] = cards;
  return {
    title: 'A reading in three parts (placeholder)',
    text:
      `With ${cardTitle(a)} setting the atmosphere and ${cardTitle(o)} standing in the way, ` +
      `${cardTitle(g)} answers that tension. [Placeholder — theme tags and authored relationship passages will connect these cards.]`,
  };
}

/** Placeholder position weights: atmosphere and obstacle count more than guidance. */
const WEIGHTS: Record<Position, number> = { atmosphere: 0.4, obstacle: 0.4, guidance: 0.2 };

/** Placeholder outlook: upright +1, reversed −1, weighted by position. */
export function outlook(cards: DeckCard[]): LuckLabel {
  const value = cards.reduce((sum, c, i) => sum + WEIGHTS[POSITIONS[i]] * (c.reversed ? -1 : 1), 0);
  if (value <= -0.8) return 'Jinxed';
  if (value <= -0.4) return 'Unlucky';
  if (value < 0.4) return 'Fair Luck';
  if (value < 0.8) return 'Lucky';
  return 'Charmed';
}
