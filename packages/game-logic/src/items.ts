/**
 * Collectible item pools. Names and descriptions are placeholders until the
 * writing work is done; identifiers are stable and must never be reused.
 */

export interface CollectibleItem<R extends string = string> {
  id: string;
  /** Tier or rarity name. */
  tier: R;
  /** Placeholder display name. */
  name: string;
}

/** Builds numbered placeholder items, tier by tier, e.g. card-001 … card-150. */
export function placeholderPool<R extends string>(
  prefix: string,
  noun: string,
  tiers: readonly (readonly [R, number])[],
): CollectibleItem<R>[] {
  const items: CollectibleItem<R>[] = [];
  const total = tiers.reduce((s, [, n]) => s + n, 0);
  const width = String(total).length < 3 ? 3 : String(total).length;
  for (const [tier, count] of tiers) {
    for (let i = 1; i <= count; i++) {
      const number = items.length + 1;
      items.push({
        id: `${prefix}-${String(number).padStart(width, '0')}`,
        tier,
        name: `${tier} ${noun} ${i}`,
      });
    }
  }
  return items;
}

export function itemsOfTier<I extends CollectibleItem>(pool: readonly I[], tier: I['tier']): I[] {
  return pool.filter((item) => item.tier === tier);
}
