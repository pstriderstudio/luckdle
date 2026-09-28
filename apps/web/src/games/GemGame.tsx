import { useEffect } from 'react';
import { gemBreaker } from '@luckdle/game-logic';
import { itemName, tierStrength } from '../items.ts';
import { glowStyle, type GameProps, NewBadge, useSavedProgress } from './common.tsx';

export function GemGame({ session, start, save, finish, isNewItem }: GameProps<'gem-breaker'>) {
  const [p, update] = useSavedProgress(session, save, { strikes: 0 });
  const strikes = session ? p.strikes : 0;

  useEffect(() => {
    if (session && !session.completed && strikes >= 3) void finish();
  }, [session, strikes, finish]);

  const strike = async () => {
    // The find is generated and saved before the first strike.
    if (!session) {
      const s = await start();
      if (!s) return;
    }
    update({ strikes: Math.min(3, strikes + 1) });
  };

  const find = session?.view.find;
  const strength = find ? tierStrength(gemBreaker.GEM_TIERS, find.kind === 'hollow' ? 'Hollow' : find.tier) : 0;
  const open = strikes >= 3;
  return (
    <div className="stage">
      <button
        type="button"
        className={`geode cracks-${strikes}${open ? ' open' : ''}`}
        style={glowStyle(strikes > 0 ? strength * (strikes / 3) : 0, '#b98cff')}
        onClick={strike}
        disabled={open}
        aria-label={open ? 'Geode opened' : `Strike the geode (${strikes} of 3)`}
      >
        {open ? (find?.kind === 'hollow' ? '🪨' : '💎') : '🪨'}
      </button>
      {!open && <p className="muted">Strike {strikes + 1} of 3 — tap the geode.</p>}
      {open && find && (
        <div className="catch-card" style={glowStyle(strength, '#b98cff')}>
          {find.kind === 'hollow' ? (
            <p className="item-title">Hollow — just dust inside.</p>
          ) : (
            <>
              <p className="item-title">
                {itemName('gem', find.mineralId)} {isNewItem('gem', find.mineralId) && <NewBadge />}
              </p>
              <p>
                {gemBreaker.GEM_SIZES[find.size]} · {find.carats} ct · {gemBreaker.GEM_PURITIES[find.purity]} · {find.tier}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
