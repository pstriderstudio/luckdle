import { useEffect, useState } from 'react';
import { coinStreak } from '@luckdle/game-logic';
import { pause } from '../ui.tsx';
import { type GameProps, useSavedProgress } from './common.tsx';

export function CoinStreakGame({ session, start, act, save, finish, reduced }: GameProps<'coin-streak'>) {
  const [p, update] = useSavedProgress(session, save, { call: 'heads' as coinStreak.CoinFace });
  const [flipping, setFlipping] = useState(false);
  const [auto, setAuto] = useState(false);
  const view = session?.view;
  const flips = view?.flips ?? [];
  const correct = flips.filter((f) => f.hit).length;
  const misses = view?.misses ?? 0;
  const over = view?.over ?? false;
  const last = flips[flips.length - 1];

  const flip = async () => {
    if (flipping || over) return;
    setFlipping(true);
    // The run length is generated and saved before the first flip.
    if (!session && !(await start())) return setFlipping(false);
    await pause(600, reduced);
    const s = await act({ type: 'flip', call: p.call });
    setFlipping(false);
    if (s && !s.view.flips[s.view.flips.length - 1].hit) setAuto(false); // Keep going stops on each miss.
  };

  useEffect(() => {
    if (!auto || flipping || over) return;
    const id = setTimeout(() => void flip(), reduced ? 50 : 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, flipping, over, flips.length]);

  useEffect(() => {
    if (session && over && !session.completed) {
      const id = setTimeout(() => void finish(), reduced ? 100 : 900);
      return () => clearTimeout(id);
    }
  }, [session, over, finish, reduced]);

  return (
    <div className="stage">
      <div className="lives" aria-label={`${coinStreak.LIVES - misses} lives left`}>
        {Array.from({ length: coinStreak.LIVES }, (_, i) => (
          <span key={i} className={i < coinStreak.LIVES - misses ? 'life' : 'life lost'}>
            ♥
          </span>
        ))}
        <span className="streak-count">{correct} correct</span>
      </div>
      <div className={`coin${flipping ? ' flipping' : ''}`} aria-live="polite">
        {flipping ? '🪙' : last ? (last.face === 'heads' ? 'H' : 'T') : '🪙'}
      </div>
      {last && !flipping && (
        <p className={last.hit ? 'reveal-line hit' : 'reveal-line miss'}>
          {last.face === 'heads' ? 'Heads' : 'Tails'} — {last.hit ? 'you called it!' : over ? 'second miss. The run is over.' : 'missed. One life left.'}
        </p>
      )}
      {!over && (
        <>
          <div className="choices" role="radiogroup" aria-label="Your call">
            {(['heads', 'tails'] as const).map((face) => (
              <button
                key={face}
                type="button"
                role="radio"
                aria-checked={p.call === face}
                className={p.call === face ? 'choice selected' : 'choice'}
                onClick={() => update({ call: face })}
                disabled={auto}
              >
                {face === 'heads' ? 'Heads' : 'Tails'}
              </button>
            ))}
          </div>
          <div className="row-actions">
            <button type="button" className="primary big" onClick={flip} disabled={flipping || auto}>
              Flip
            </button>
            {flips.length >= 3 && (
              <button type="button" onClick={() => setAuto((a) => !a)}>
                {auto ? 'Pause' : 'Keep going'}
              </button>
            )}
          </div>
          <p className="muted small">Call before every flip. The run ends on your second wrong call.</p>
        </>
      )}
      {flips.length > 0 && (
        <ol className="flip-history" aria-label="Flips so far">
          {flips.map((f, i) => (
            <li key={i} className={f.hit ? 'hit' : 'miss'} title={`Called ${f.call}, landed ${f.face}`}>
              {f.face === 'heads' ? 'H' : 'T'}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
