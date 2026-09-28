/** Collectible pools by type, for names and the collection tabs. */
import {
  cardPack,
  type CollectibleItem,
  dailySummon,
  gardenOfChance,
  gemBreaker,
  luckyFishing,
  wishingWell,
} from '@luckdle/game-logic';
import type { ItemType } from './service/types.ts';

export interface PoolInfo {
  type: ItemType;
  tab: string;
  /** Tiers from most common to rarest (used for the rarity filter and ordering). */
  tiers: readonly string[];
  items: readonly CollectibleItem[];
}

export const POOLS: PoolInfo[] = [
  { type: 'card', tab: 'Cards', tiers: cardPack.CARD_RARITIES, items: cardPack.CARDS },
  { type: 'character', tab: 'Characters', tiers: dailySummon.STAR_TIERS, items: dailySummon.CHARACTERS },
  { type: 'fish', tab: 'Fish', tiers: luckyFishing.CATCH_TYPES, items: luckyFishing.FISHING_POOL },
  { type: 'curio', tab: 'Curios', tiers: wishingWell.WELL_TIERS, items: wishingWell.CURIOS },
  { type: 'gem', tab: 'Gems', tiers: gemBreaker.GEM_TIERS.slice(1), items: gemBreaker.MINERALS },
  { type: 'plant', tab: 'Garden', tiers: gardenOfChance.PLANT_TIERS, items: gardenOfChance.PLANTS },
];

const byId = new Map<string, CollectibleItem>();
for (const pool of POOLS) for (const item of pool.items) byId.set(`${pool.type}:${item.id}`, item);

export function itemName(type: ItemType, id: string): string {
  return byId.get(`${type}:${id}`)?.name ?? id;
}

export function itemNumber(id: string): string {
  return `#${Number(id.split('-').pop())}`;
}

/** 0 (most common) … 1 (rarest), for glow strength. */
export function tierStrength(tiers: readonly string[], tier: string): number {
  const i = tiers.indexOf(tier);
  return tiers.length <= 1 ? 1 : Math.max(0, i) / (tiers.length - 1);
}
