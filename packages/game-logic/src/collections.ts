/** Collectible pools by type: names for results and the collection tabs. */
import * as cardPack from './games/cardPack.ts';
import * as dailySummon from './games/dailySummon.ts';
import * as gardenOfChance from './games/gardenOfChance.ts';
import * as gemBreaker from './games/gemBreaker.ts';
import * as luckyFishing from './games/luckyFishing.ts';
import * as wishingWell from './games/wishingWell.ts';
import type { CollectibleItem } from './items.ts';

export type ItemType = 'card' | 'character' | 'fish' | 'curio' | 'gem' | 'plant';

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
