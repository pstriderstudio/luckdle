/** Collectible pools (from the shared package) plus display helpers. */
export { itemName, POOLS, type PoolInfo } from '@luckdle/game-logic';

export function itemNumber(id: string): string {
  return `#${Number(id.split('-').pop())}`;
}

/** 0 (most common) … 1 (rarest), for glow strength. */
export function tierStrength(tiers: readonly string[], tier: string): number {
  const i = tiers.indexOf(tier);
  return tiers.length <= 1 ? 1 : Math.max(0, i) / (tiers.length - 1);
}
