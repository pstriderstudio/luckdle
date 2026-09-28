import { useEffect, useRef, useState } from 'react';
import { dailySummon } from '@luckdle/game-logic';
import { itemName } from '../items.ts';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, NewBadge, onActivateKey, tierColor, useSavedProgress } from './common.tsx';

type Stage = 'portal' | 'pulls' | 'grid';

function Stars({ n, animate }: { n: number; animate?: boolean }) {
  return (
    <span className="stars" aria-label={`${n} stars`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={animate ? 'star-pop' : undefined} style={{ animationDelay: `${i * 180}ms` }}>
          ★
        </span>
      ))}
    </span>
  );
}

function Character({ pull, big }: { pull: dailySummon.SummonPull; big?: boolean }) {
  const color = tierColor(dailySummon.STAR_TIERS, `${pull.stars}★`);
  return (
    <div className={`character${big ? ' big' : ''}`} style={{ borderColor: color }}>
      <span className="silhouette" aria-hidden>
        🧙
      </span>
      <span className="tcg-name">{itemName('character', pull.characterId)}</span>
      <Stars n={pull.stars} animate={big} />
      {pull.isNew && <NewBadge />}
    </div>
  );
}

export function SummonGame({ session, start, save, finish, reduced }: GameProps<'daily-summon'>) {
  const [p, update] = useSavedProgress(session, save, { stage: 'portal' as Stage, next: 0 });
  const [charging, setCharging] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const trace = useRef<{ angle: number; total: number } | null>(null);
  const pulls = session?.view.pulls ?? [];
  const stage: Stage = session ? p.stage : 'portal';
  const best = pulls.length ? Math.max(...pulls.map((x) => x.stars)) : 0;

  const charge = async () => {
    if (session || charging) return;
    setCharging(true);
    // All ten pulls are generated, saved, and added to the collection first.
    const s = await start();
    if (!s) return setCharging(false);
    await pause(1400, reduced);
    setCharging(false);
    update({ stage: 'pulls', next: 0 });
  };

  const nextPull = () => {
    let next = p.next;
    while (next < pulls.length && pulls[next].skipReveal) next++;
    if (next >= pulls.length) {
      setCurrent(null);
      update({ stage: 'grid', next });
      return;
    }
    setCurrent(next);
    update({ next: next + 1 });
  };

  const skipped = pulls.slice(0, p.next).filter((x) => x.skipReveal).length;

  // The result appears together with the grid of all ten; no extra click.
  useEffect(() => {
    if (stage === 'grid' && session && !session.completed) void finish();
  }, [stage, session, finish]);

  if (stage === 'portal') {
    const bestNow = Math.max(0, ...(session?.view.pulls ?? []).map((x) => x.stars));
    return (
      <div className="stage">
        <div
          className={`portal${charging ? ' charging' : ''}`}
          style={glowStyle(charging ? bestNow / 5 : 0.1, tierColor(dailySummon.STAR_TIERS, `${Math.max(bestNow, 1)}★`))}
          role="button"
          tabIndex={0}
          aria-label="Summoning portal. Press Enter to charge it."
          onKeyDown={onActivateKey(charge)}
          onClick={charge}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            trace.current = { angle: Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2), total: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!trace.current) return;
            const r = e.currentTarget.getBoundingClientRect();
            const a = Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2);
            let d = a - trace.current.angle;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            trace.current = { angle: a, total: trace.current.total + d };
            if (Math.abs(trace.current.total) > Math.PI * 1.7) {
              trace.current = null;
              void charge();
            }
          }}
          onPointerUp={() => (trace.current = null)}
        >
          🔮
        </div>
        <p className="muted">{charging ? 'The portal is charging…' : 'Trace a circle around the portal to charge it, or tap it.'}</p>
      </div>
    );
  }

  if (stage === 'pulls') {
    const shown = current !== null ? pulls[current] : null;
    const spotlight = shown && shown.stars >= 4;
    return (
      <div className="stage">
        <p className="muted small">
          Pull {Math.min(p.next, 10)} of 10{skipped > 0 ? ` · ${skipped} already collected` : ''}
        </p>
        <div className={`pull-view${spotlight ? ' spotlight' : ''}`} style={glowStyle(shown ? (shown.stars - 1) / 4 : 0, tierColor(dailySummon.STAR_TIERS, `${shown?.stars ?? 1}★`))}>
          {shown ? <Character key={current} pull={shown} big /> : <p className="muted">The portal hums, glowing like a {best}★.</p>}
        </div>
        <button type="button" className="primary big" onClick={nextPull}>
          {p.next >= 10 ? 'See all ten' : 'Next pull'}
        </button>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="summon-grid">
        {pulls.map((pull, i) => (
          <div key={i} className="grid-cell">
            <Character pull={pull} />
            {!pull.isNew && <span className="badge muted">Owned</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
