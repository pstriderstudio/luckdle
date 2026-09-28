import { useEffect, useMemo, useState } from 'react';
import { gemBreaker, luckyFishing } from '@luckdle/game-logic';
import { useStore } from './service/store.tsx';
import type { CollectionEntry } from './service/types.ts';
import { itemNumber, POOLS } from './items.ts';
import { tierColor } from './games/common.tsx';

/** Collection tabs: owned items, numbered silhouettes for undiscovered ones, progress, New markers. */
export function Collection() {
  const { snapshot, run } = useStore();
  const [tab, setTab] = useState(POOLS[0].type);
  const [rarity, setRarity] = useState<string>('all');
  // Items that were New when this tab was opened stay marked until the tab changes.
  const [shownNew, setShownNew] = useState<Set<string>>(new Set());

  const pool = POOLS.find((p) => p.type === tab)!;
  const owned = useMemo(() => {
    const map = new Map<string, CollectionEntry>();
    for (const entry of snapshot?.collection ?? []) if (entry.type === tab) map.set(entry.itemId, entry);
    return map;
  }, [snapshot, tab]);

  useEffect(() => {
    const fresh = [...owned.values()].filter((e) => e.isNew);
    if (fresh.length === 0) return;
    setShownNew((prev) => new Set([...prev, ...fresh.map((e) => e.itemId)]));
    void run((s) => s.markViewed(fresh.map((e) => ({ type: e.type, itemId: e.itemId }))));
  }, [owned, run]);

  if (!snapshot) return null;
  const items = pool.items.filter((i) => rarity === 'all' || i.tier === rarity);
  const ownedCount = pool.items.filter((i) => owned.has(i.id)).length;

  return (
    <section>
      <h1>Collection</h1>
      <nav className="tabs" role="tablist" aria-label="Collection">
        {POOLS.map((p) => {
          const count = snapshot.collection.filter((c) => c.type === p.type).length;
          const hasNew = snapshot.collection.some((c) => c.type === p.type && c.isNew);
          return (
            <button
              key={p.type}
              type="button"
              role="tab"
              aria-selected={p.type === tab}
              className={p.type === tab ? 'tab selected' : 'tab'}
              onClick={() => {
                setTab(p.type);
                setRarity('all');
                setShownNew(new Set());
              }}
            >
              {p.tab} <span className="count">{count}/{p.items.length}</span>
              {hasNew && <span className="dot" aria-label="new items" />}
            </button>
          );
        })}
      </nav>

      <div className="collection-toolbar">
        <p className="progress-line">
          {ownedCount} / {pool.items.length} collected
        </p>
        <label>
          Rarity{' '}
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            <option value="all">All</option>
            {pool.tiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className={`collection-grid${tab === 'plant' ? ' garden-bed' : ''}`}>
        {items.map((item) => {
          const entry = owned.get(item.id);
          const color = tierColor(pool.tiers, item.tier);
          if (!entry) {
            return (
              <li key={item.id} className="collectible missing" style={{ borderColor: color }}>
                <span className="silhouette" aria-hidden>
                  {tab === 'plant' ? '🟫' : '?'}
                </span>
                <span className="small">{itemNumber(item.id)}</span>
                <span className="small" style={{ color }}>
                  {item.tier}
                </span>
              </li>
            );
          }
          return (
            <li key={item.id} className="collectible" style={{ borderColor: color }}>
              <span className="small muted">{itemNumber(item.id)}</span>
              <span className="collectible-name">{item.name}</span>
              <span className="small" style={{ color }}>
                {item.tier}
              </span>
              {shownNew.has(item.id) && <span className="badge new">New</span>}
              <Best entry={entry} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Best({ entry }: { entry: CollectionEntry }) {
  const b = entry.best;
  if (!b) return null;
  if (entry.type === 'fish') {
    return (
      <span className="best small">
        Longest {b.length} cm · Rarest trait {luckyFishing.TRAIT_NAMES[b.trait ?? 0]}
      </span>
    );
  }
  if (entry.type === 'gem') {
    return (
      <span className="best small">
        Largest {gemBreaker.GEM_SIZES[b.size ?? 0]} ({b.carats} ct) · Purest {gemBreaker.GEM_PURITIES[b.purity ?? 0]}
      </span>
    );
  }
  if (entry.type === 'plant') {
    return (
      <span className="best small">
        Best bloom: {b.mutations && b.mutations.length > 0 ? b.mutations.join(' + ') : 'plain'}
      </span>
    );
  }
  return null;
}
