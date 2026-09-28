/**
 * Mystery Card Pack: a 12-card booster (6 Common, 3 Uncommon, 2 wildcards,
 * 1 guaranteed Rare-or-better). Luck compares rarities highest first:
 * the podium, then the rest of the pack.
 */
import { type CollectibleItem, itemsOfTier, placeholderPool } from '../items.ts';
import { type LuckResult, type RankedGroup, rankOutcomes } from '../luck.ts';
import { pickOne, pickWeighted, type Rng } from '../rng.ts';

export const CARD_RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

/** Per-mille odds for each wildcard slot, by rarity. */
export const WILDCARD_ODDS = [650, 250, 70, 20, 9, 1] as const;
/** Per-mille odds for the guaranteed Rare-or-better slot. */
export const GUARANTEED_ODDS = [0, 0, 750, 200, 45, 5] as const;

export type PackSlot = 'Common' | 'Uncommon' | 'Wildcard' | 'Guaranteed';
/** Slots in pack (reveal) order. */
export const PACK_SLOTS: readonly PackSlot[] = [
  ...Array<PackSlot>(6).fill('Common'),
  ...Array<PackSlot>(3).fill('Uncommon'),
  'Wildcard',
  'Wildcard',
  'Guaranteed',
];

export const CARDS: CollectibleItem<CardRarity>[] = placeholderPool('card', 'Card', [
  ['Common', 60],
  ['Uncommon', 40],
  ['Rare', 25],
  ['Super Rare', 15],
  ['Ultra Rare', 7],
  ['Secret Rare', 3],
]);

export const RARE = CARD_RARITIES.indexOf('Rare');

export interface PackCard {
  cardId: string;
  rarity: CardRarity;
  slot: PackSlot;
  /** First copy of a card the player did not own when the pack was generated. */
  isNew: boolean;
  /** Below Rare and already owned (or an earlier copy in this pack): individual reveal skipped. */
  skipReveal: boolean;
}

export interface PackOutcome {
  cards: PackCard[];
  /** Whether weekly-streak new-card priority applied to this pack. */
  newCardPriority: boolean;
}

export interface PackOptions {
  /** Card ids owned before this pack (ownership snapshot). */
  owned?: ReadonlySet<string>;
  /** True from the 7th consecutive game day of the streak. */
  newCardPriority?: boolean;
}

function rollRarity(rng: Rng, slot: PackSlot): number {
  switch (slot) {
    case 'Common': return 0;
    case 'Uncommon': return 1;
    case 'Wildcard': return pickWeighted(rng, WILDCARD_ODDS);
    case 'Guaranteed': return pickWeighted(rng, GUARANTEED_ODDS);
  }
}

export function openPack(rng: Rng, options: PackOptions = {}): PackOutcome {
  const owned = options.owned ?? new Set<string>();
  const priority = options.newCardPriority ?? false;
  const seen = new Set<string>();
  const cards: PackCard[] = [];
  for (const slot of PACK_SLOTS) {
    const rarityIndex = rollRarity(rng, slot);
    const rarity = CARD_RARITIES[rarityIndex];
    const pool = itemsOfTier(CARDS, rarity);
    let candidates = pool;
    if (priority) {
      const unowned = pool.filter((c) => !owned.has(c.id) && !seen.has(c.id));
      if (unowned.length > 0) candidates = unowned;
    }
    const card = pickOne(rng, candidates);
    const alreadyHad = owned.has(card.id) || seen.has(card.id);
    cards.push({
      cardId: card.id,
      rarity,
      slot,
      isNew: !alreadyHad,
      skipReveal: alreadyHad && rarityIndex < RARE,
    });
    seen.add(card.id);
  }
  return { cards, newCardPriority: priority };
}

/** Rarity indexes of a pack, highest first. */
export function rarityProfile(rarities: readonly CardRarity[]): number[] {
  return rarities.map((r) => CARD_RARITIES.indexOf(r)).sort((a, b) => b - a);
}

/** Compares two packs (as rarity profiles), lowest luck first. */
export function comparePacks(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/** Indexes (into pack.cards) of the three podium cards, rarest first. */
export function podium(pack: PackOutcome): number[] {
  return pack.cards
    .map((c, i) => ({ i, r: CARD_RARITIES.indexOf(c.rarity) }))
    .sort((a, b) => b.r - a.r || b.i - a.i)
    .slice(0, 3)
    .map((x) => x.i);
}

let table: RankedGroup<number[]>[] | undefined;

/** Exact table of the 52 distinct packs (variable slots' rarities). */
export function packTable(): RankedGroup<number[]>[] {
  if (table) return table;
  const fixed = [...Array(6).fill(0), ...Array(3).fill(1)];
  const byKey = new Map<string, { value: number[]; probability: number }>();
  for (let g = 0; g < 6; g++) {
    for (let w1 = 0; w1 < 6; w1++) {
      for (let w2 = 0; w2 < 6; w2++) {
        const p = (GUARANTEED_ODDS[g] * WILDCARD_ODDS[w1] * WILDCARD_ODDS[w2]) / 1e9;
        if (p === 0) continue;
        const profile = [...fixed, g, w1, w2].sort((a, b) => b - a);
        const key = profile.join(',');
        const entry = byKey.get(key) ?? { value: profile, probability: 0 };
        entry.probability += p;
        byKey.set(key, entry);
      }
    }
  }
  table = rankOutcomes([...byKey.values()], comparePacks);
  return table;
}

export function evaluatePack(pack: PackOutcome): LuckResult & { podium: number[] } {
  const profile = rarityProfile(pack.cards.map((c) => c.rarity));
  const group = packTable().find((g) => comparePacks(g.outcomes[0], profile) === 0);
  if (!group) throw new Error('Invalid pack');
  return { score: group.score, label: group.label, probability: group.probability, podium: podium(pack) };
}
