import { useEffect, useState } from 'react';
import { pause } from '../ui.tsx';
import type { GameProps } from './common.tsx';

const MARKERS = [
  { symbol: '☉', name: 'Sun' },
  { symbol: '☾', name: 'Moon' },
  { symbol: '★', name: 'Star' },
];

export function CosmicGame({ session, start, finish, reduced }: GameProps<'cosmic-alignment'>) {
  const [phase, setPhase] = useState<'ready' | 'settling' | 'settled'>(session ? 'settled' : 'ready');

  useEffect(() => {
    if (session && !session.completed && phase === 'settled') void finish();
  }, [session, phase, finish]);

  const begin = async () => {
    const s = await start();
    if (!s) return;
    setPhase('settling');
    // Outer settles first, then middle, then inner (see ring transition delays).
    await pause(5200, reduced);
    setPhase('settled');
  };

  const angles = session?.view.angles;
  return (
    <div className="stage">
      <div className={`rings ${phase}`}>
        {MARKERS.map((m, i) => {
          // Ring 0 is outer (Sun) … ring 2 inner (Star). Extra turns make the settle visible.
          const final = angles ? angles[i] + 360 * (3 + i) : 0;
          const style =
            phase === 'ready'
              ? undefined
              : {
                  transform: `rotate(${final}deg)`,
                  transitionDuration: reduced ? '0.15s' : `${3 + i}s`,
                  transitionDelay: reduced ? '0s' : `${i * 0.6}s`,
                };
          return (
            <div key={m.name} className={`ring ring-${i}`} style={style}>
              <span className="marker" aria-label={m.name}>
                {m.symbol}
              </span>
            </div>
          );
        })}
      </div>
      {phase === 'ready' && (
        <button type="button" className="primary big" onClick={begin}>
          Begin
        </button>
      )}
      {phase === 'settling' && <p className="muted">The rings are settling…</p>}
      {phase === 'settled' && session && (
        <p className="reveal-line">
          {session.view.flavour}: all three within {session.view.spread.toFixed(1)}°
        </p>
      )}
    </div>
  );
}
