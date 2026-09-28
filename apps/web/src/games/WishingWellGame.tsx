import { useEffect, useRef, useState } from 'react';
import { wishingWell } from '@luckdle/game-logic';
import { itemName, tierStrength } from '../items.ts';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, NewBadge } from './common.tsx';

export function WishingWellGame({ session, start, finish, reduced, isNewItem }: GameProps<'wishing-well'>) {
  const [wish, setWish] = useState<wishingWell.Wish | null>(null);
  const [phase, setPhase] = useState<'choose' | 'splash' | 'ripples' | 'shown'>(session ? 'shown' : 'choose');
  const drag = useRef<number | null>(null);

  useEffect(() => {
    if (session && !session.completed && phase === 'shown') void finish();
  }, [session, phase, finish]);

  const toss = async () => {
    if (!wish) return;
    const s = await start({ wish });
    if (!s) return;
    setPhase('splash');
    await pause(900, reduced);
    setPhase('ripples');
    await pause(1300, reduced);
    setPhase('shown');
  };

  const view = session?.view;
  const strength = view ? tierStrength(wishingWell.WELL_TIERS, view.tier) : 0;
  return (
    <div className="stage">
      {phase === 'choose' && (
        <>
          <p>Choose your wish. It sets the theme of what you find; the odds are the same for every wish.</p>
          <div className="choices" role="radiogroup" aria-label="Wish">
            {wishingWell.WISHES.map((w) => (
              <button key={w} type="button" role="radio" aria-checked={wish === w} className={wish === w ? 'choice selected' : 'choice'} onClick={() => setWish(w)}>
                {w}
              </button>
            ))}
          </div>
        </>
      )}
      <div
        className={`well ${phase}`}
        style={glowStyle(phase === 'ripples' || phase === 'shown' ? strength : 0, '#7fd7ff')}
        onPointerDown={(e) => (drag.current = e.clientY)}
        onPointerUp={(e) => {
          if (drag.current !== null && drag.current - e.clientY > 30 && phase === 'choose') void toss();
          drag.current = null;
        }}
      >
        <span className="well-coin" aria-hidden>
          🪙
        </span>
        <span className="well-water" aria-hidden>
          ⛲
        </span>
      </div>
      {phase === 'choose' && (
        <button type="button" className="primary big" disabled={!wish} onClick={toss}>
          {wish ? `Toss a coin for ${wish}` : 'Choose a wish first'}
        </button>
      )}
      {phase === 'choose' && wish && <p className="muted small">Or flick the coin upward into the well.</p>}
      {phase === 'splash' && <p className="muted">Splash!</p>}
      {phase === 'ripples' && <p className="muted">The ripples glow…</p>}
      {phase === 'shown' && view && (
        <div className="bubble" style={glowStyle(strength, '#7fd7ff')}>
          <p className="item-title">
            {itemName('curio', view.curioId)} {isNewItem('curio', view.curioId) && <NewBadge />}
          </p>
          <p className="muted">
            A {view.tier.toLowerCase()} curio for {view.wish}. (Placeholder description.)
          </p>
        </div>
      )}
    </div>
  );
}
