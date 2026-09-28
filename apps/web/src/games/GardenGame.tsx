import { useEffect, useState } from 'react';
import { gardenOfChance } from '@luckdle/game-logic';
import { itemName, tierStrength } from '../items.ts';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, NewBadge, useSavedProgress } from './common.tsx';

const STAGES = ['🌰', '🌱', '🌿', '🌷'];
const STAGE_NAMES = ['Seed', 'Sprout', 'Bud', 'Bloom'];

export function GardenGame({ session, start, save, finish, reduced, isNewItem }: GameProps<'garden-of-chance'>) {
  const [p, update] = useSavedProgress(session, save, { waterings: 0 });
  const [sparkles, setSparkles] = useState(session?.completed ? 99 : 0);
  const waterings = session ? p.waterings : 0;
  const bloom = session?.view.bloom;
  const mutations = bloom?.kind === 'flower' ? bloom.mutations : [];
  const bloomed = waterings >= 3;

  useEffect(() => {
    if (!bloomed || !session || session.completed) return;
    let cancelled = false;
    (async () => {
      for (let i = 1; i <= mutations.length; i++) {
        await pause(600, reduced);
        if (cancelled) return;
        setSparkles(i);
      }
      await pause(300, reduced);
      if (!cancelled) void finish();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloomed]);

  const plant = async () => {
    await start();
  };

  const water = () => update({ waterings: Math.min(3, waterings + 1) });

  const strength = bloom ? tierStrength(gardenOfChance.PLANT_TIERS, bloom.kind === 'weed' ? 'Weed' : bloom.tier) : 0;
  return (
    <div className="stage">
      <div className="plot" style={glowStyle(waterings >= 2 ? strength : 0, '#ffb3e6')}>
        <span className="plant-stage" aria-label={session ? STAGE_NAMES[waterings] : 'Empty plot'}>
          {session ? (bloomed && bloom?.kind === 'weed' ? '🥀' : STAGES[waterings]) : '🟫'}
        </span>
      </div>
      {!session && (
        <button type="button" className="primary big" onClick={plant}>
          Plant a mystery seed
        </button>
      )}
      {session && !bloomed && (
        <button type="button" className="primary big" onClick={water}>
          Water ({waterings + 1} of 3)
        </button>
      )}
      {bloomed && bloom && (
        <div className="catch-card" style={glowStyle(strength, '#ffb3e6')}>
          <p className="item-title">
            {itemName('plant', bloom.plantId)} {isNewItem('plant', bloom.plantId) && <NewBadge />}
          </p>
          {bloom.kind === 'weed' ? (
            <p className="muted">A weed. Every garden has them.</p>
          ) : (
            <>
              <p>{bloom.tier}</p>
              <ul className="mutations">
                {mutations.map((m, i) => (
                  <li key={m} className={i < sparkles ? 'sparkle shown' : 'sparkle'}>
                    ✨ {m}
                  </li>
                ))}
                {mutations.length === 0 && <li className="muted">No mutations</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
