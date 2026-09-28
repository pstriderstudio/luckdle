import { useEffect, useState } from 'react';
import { threeChests } from '@luckdle/game-logic';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, tierColor } from './common.tsx';

const ICONS: Record<threeChests.Treasure, string> = {
  Cobwebs: '🕸️',
  Copper: '🟤',
  Silver: '⚪',
  Gold: '🟡',
  Jewels: '💍',
  Relic: '🏺',
};

export function ThreeChestsGame({ session, start, act, finish, reduced }: GameProps<'three-chests'>) {
  const view = session?.view;
  const pick = view?.pick ?? null;
  const [opened, setOpened] = useState<number[]>(pick !== null ? [0, 1, 2] : []);
  const [busy, setBusy] = useState(false);

  const choose = async (chest: number) => {
    if (busy || pick !== null) return;
    setBusy(true);
    // The chests were filled when the game started; contents arrive only with the pick.
    if (!session && !(await start())) return setBusy(false);
    const s = await act({ type: 'pick', chest });
    if (!s) return setBusy(false);
    setOpened([chest]);
    await pause(1200, reduced);
    const others = [0, 1, 2].filter((i) => i !== chest);
    for (const other of others) {
      setOpened((o) => [...o, other]);
      await pause(900, reduced);
    }
    setBusy(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3'].includes(e.key)) void choose(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (session && pick !== null && opened.length === 3 && !busy && !session.completed) void finish();
  }, [session, pick, opened.length, busy, finish]);

  return (
    <div className="stage">
      {pick === null && <p>Pick one of three chests (tap, or press 1–3). Every chest has the same odds.</p>}
      <div className="chests">
        {[0, 1, 2].map((i) => {
          const isOpen = opened.includes(i);
          const treasure = isOpen ? view?.chests[i] : null;
          const strength = treasure ? threeChests.TREASURES.indexOf(treasure) / 5 : 0;
          return (
            <button
              key={i}
              type="button"
              className={`chest${isOpen ? ' open' : ''}${pick === i ? ' picked' : ''}`}
              style={glowStyle(treasure ? strength : 0, treasure ? tierColor(threeChests.TREASURES, treasure) : undefined)}
              onClick={() => choose(i)}
              disabled={pick !== null || busy}
              aria-label={treasure ? `Chest ${i + 1}: ${treasure}` : `Chest ${i + 1}`}
            >
              <span className="chest-icon" aria-hidden>
                {treasure ? ICONS[treasure] : '🧰'}
              </span>
              <span className="chest-label">{treasure ?? `Chest ${i + 1}`}</span>
              {pick === i && <span className="badge picked">Your pick</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
