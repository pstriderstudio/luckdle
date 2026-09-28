import { useEffect, useState } from 'react';
import { dice } from '@luckdle/game-logic';
import { formatOneIn, pause } from '../ui.tsx';
import type { GameProps } from './common.tsx';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceGame({ session, start, finish, reduced }: GameProps<'dice-of-destiny'>) {
  const [phase, setPhase] = useState<'ready' | 'rolling' | 'shown'>(session ? 'shown' : 'ready');
  const [tumble, setTumble] = useState([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (phase !== 'rolling' || reduced) return;
    const id = setInterval(() => setTumble(tumble.map(() => 1 + Math.floor(Math.random() * 6))), 90);
    return () => clearInterval(id);
  }, [phase, reduced, tumble]);

  // Resuming a roll that was generated but not shown: go straight to the saved dice.
  useEffect(() => {
    if (session && !session.completed && phase === 'shown') void finish();
  }, [session, phase, finish]);

  const roll = async () => {
    setPhase('rolling');
    const s = await start();
    if (!s) return setPhase('ready');
    await pause(1100, reduced);
    setPhase('shown');
  };

  const shown = phase === 'shown' && session;
  const values = shown ? session.view.dice : tumble;
  const group = shown ? dice.diceTable().find((g) => g.outcomes[0] === session.view.combination) : undefined;

  return (
    <div className="stage dice-stage">
      <div className={`dice-row ${phase}`} aria-label={shown ? `Dice: ${values.join(', ')}` : undefined} role="img">
        {values.map((v, i) => (
          <span key={i} className="die" style={{ animationDelay: `${i * 60}ms` }}>
            {FACES[v - 1]}
          </span>
        ))}
      </div>
      {phase === 'ready' && (
        <button type="button" className="primary big" onClick={roll}>
          Roll the dice
        </button>
      )}
      {phase === 'rolling' && <p className="muted">Rolling…</p>}
      {shown && group && (
        <p className="reveal-line">
          {session.view.combination} — about 1 in {formatOneIn(group.probability)} rolls
        </p>
      )}
    </div>
  );
}
