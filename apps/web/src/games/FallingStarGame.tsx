import { useEffect, useRef, useState } from 'react';
import { fallingStar } from '@luckdle/game-logic';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps } from './common.tsx';

const widths = fallingStar.slotWidths();
const centres = widths.map((_, i) => widths.slice(0, i).reduce((s, w) => s + w, 0) + widths[i] / 2);

export function FallingStarGame({ session, start, finish, reduced }: GameProps<'falling-star'>) {
  const [phase, setPhase] = useState<'ready' | 'falling' | 'landed'>(session ? 'landed' : 'ready');
  const starRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session && !session.completed && phase === 'landed') void finish();
  }, [session, phase, finish]);

  const wish = async () => {
    setPhase('falling');
    const s = await start();
    if (!s) return setPhase('ready');
    const { slot, entry } = s.view;
    const target = centres[slot];
    const el = starRef.current;
    if (el && !reduced) {
      // Choreographed bounce path ending in the saved slot, with a near-miss around the centre.
      const points = [entry, (entry + 0.5) / 2, 0.5 + (target < 0.5 ? 0.06 : -0.06), (0.5 + target) / 2, target];
      const keyframes = points.map((x, i) => ({
        left: `${x * 100}%`,
        top: `${(i / (points.length - 1)) * 86}%`,
      }));
      await el.animate(keyframes, { duration: 2400, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    } else {
      await pause(300, true);
    }
    setPhase('landed');
  };

  const landed = phase === 'landed' && session ? session.view.slot : null;
  return (
    <div className="stage">
      <div className="star-board" aria-hidden={phase === 'falling'}>
        <div className="pegs" />
        <div ref={starRef} className={`falling-star ${phase}`} style={landed !== null ? { left: `${centres[landed] * 100}%`, top: '86%' } : undefined}>
          ★
        </div>
        <div className="slots">
          {fallingStar.STAR_SLOTS.map((tier, i) => (
            <div
              key={i}
              className={`slot${landed === i ? ' landed' : ''}`}
              style={{ width: `${widths[i] * 100}%`, ...glowStyle(landed === i ? fallingStar.STAR_TIERS.indexOf(tier) / 5 : 0) }}
              title={tier}
            >
              <span>{tier}</span>
            </div>
          ))}
        </div>
      </div>
      {phase === 'ready' && (
        <button type="button" className="primary big" onClick={wish}>
          Make a wish
        </button>
      )}
      {landed !== null && <p className="reveal-line">The star settled in {fallingStar.STAR_SLOTS[landed]}.</p>}
    </div>
  );
}
