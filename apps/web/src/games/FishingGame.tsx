import { useEffect, useRef, useState } from 'react';
import { luckyFishing } from '@luckdle/game-logic';
import { itemName, tierStrength } from '../items.ts';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, NewBadge } from './common.tsx';

export function FishingGame({ session, start, finish, reduced, isNewItem }: GameProps<'lucky-fishing'>) {
  const [phase, setPhase] = useState<'ready' | 'waiting' | 'bite' | 'reeling' | 'shown'>(session ? 'shown' : 'ready');
  const pull = useRef<number | null>(null);

  useEffect(() => {
    if (session && !session.completed && phase === 'shown') void finish();
  }, [session, phase, finish]);

  const castLine = async () => {
    const s = await start();
    if (!s) return;
    setPhase('waiting');
    await pause(1800, reduced);
    setPhase('bite');
  };

  const reel = async () => {
    setPhase('reeling');
    await pause(1000, reduced);
    setPhase('shown');
  };

  const c = session?.view.catch;
  const strength = c ? tierStrength(luckyFishing.CATCH_TYPES, c.kind === 'junk' ? 'Junk' : c.type) : 0;
  const id = c ? (c.kind === 'junk' ? c.itemId : c.speciesId) : '';
  return (
    <div className="stage">
      <div
        className={`pond ${phase}`}
        onPointerDown={(e) => (pull.current = e.clientY)}
        onPointerUp={(e) => {
          if (pull.current !== null && e.clientY - pull.current > 40 && phase === 'ready') void castLine();
          pull.current = null;
        }}
      >
        <span className="bobber" aria-hidden>
          {phase === 'bite' ? '💦' : '🔴'}
        </span>
        {phase === 'shown' && c && (
          <span className="catch rise" style={glowStyle(strength)} aria-hidden>
            {c.kind === 'junk' ? '🥾' : '🐟'}
          </span>
        )}
      </div>
      {phase === 'ready' && (
        <>
          <button type="button" className="primary big" onClick={castLine}>
            Cast
          </button>
          <p className="muted small">Or pull back (drag down) on the water and release.</p>
        </>
      )}
      {phase === 'waiting' && <p className="muted">The bobber drifts…</p>}
      {phase === 'bite' && (
        <button type="button" className="primary big pulse" onClick={reel}>
          Bite! Reel in
        </button>
      )}
      {phase === 'reeling' && <p className="muted">Reeling in…</p>}
      {phase === 'shown' && c && (
        <div className="catch-card" style={glowStyle(strength)}>
          <p className="item-title">
            {itemName('fish', id)} {isNewItem('fish', id) && <NewBadge />}
          </p>
          {c.kind === 'fish' ? (
            <p>
              {luckyFishing.SIZE_CLASSES[c.sizeClass]} · {c.length} cm · {luckyFishing.TRAIT_NAMES[c.trait]} · {c.type}
            </p>
          ) : (
            <p className="muted">Junk. It happens to everyone.</p>
          )}
        </div>
      )}
    </div>
  );
}
