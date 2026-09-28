import { useEffect, useRef, useState } from 'react';
import { cardPack } from '@luckdle/game-logic';
import { itemName } from '../items.ts';
import { pause } from '../ui.tsx';
import { glowStyle, type GameProps, NewBadge, onActivateKey, tierColor, useSavedProgress } from './common.tsx';

type Stage = 'sealed' | 'stack' | 'podium';

const rarityIndex = (r: cardPack.CardRarity) => cardPack.CARD_RARITIES.indexOf(r);

function CardFace({ card, small }: { card: cardPack.PackCard; small?: boolean }) {
  const color = tierColor(cardPack.CARD_RARITIES, card.rarity);
  return (
    <div className={`tcg-card${small ? ' small' : ''}`} style={{ borderColor: color }}>
      <span className="tcg-rarity" style={{ color }}>
        {card.rarity}
      </span>
      <span className="tcg-name">{itemName('card', card.cardId)}</span>
      {card.isNew && <NewBadge />}
    </div>
  );
}

export function CardPackGame({ session, start, save, finish, reduced, streak, newCardPriority }: GameProps<'mystery-card-pack'>) {
  const [p, update] = useSavedProgress(session, save, { stage: 'sealed' as Stage, next: 0 });
  const [rising, setRising] = useState<number | null>(null);
  const [fast, setFast] = useState(false);
  const [busy, setBusy] = useState(false);
  const tear = useRef<{ x: number; width: number } | null>(null);
  const cards = session?.view.cards ?? [];
  const stage: Stage = session ? p.stage : 'sealed';

  const open = async () => {
    if (session || busy) return;
    setBusy(true);
    // All 12 cards are generated, saved, and added to the collection before any animation.
    const s = await start();
    setBusy(false);
    if (s) update({ stage: 'stack', next: 0 });
  };

  /** Reveals the next card; skipped duplicates below Rare are passed over and tallied. */
  const flipNext = async (): Promise<boolean> => {
    let next = p.next;
    while (next < cards.length && cards[next].skipReveal) next++;
    if (next >= cards.length) {
      update({ stage: 'podium', next });
      return false;
    }
    const card = cards[next];
    const rare = rarityIndex(card.rarity) >= cardPack.RARE;
    if (rare) {
      setRising(next);
      await pause(1200, reduced);
      setRising(null);
    }
    update({ next: next + 1 });
    return !rare;
  };

  const flip = async () => {
    if (busy) return;
    setBusy(true);
    await flipNext();
    setBusy(false);
  };

  // “Reveal the rest”: speeds through Commons and Uncommons, stopping for every rare moment.
  useEffect(() => {
    if (!fast || stage !== 'stack' || busy) return;
    const upcoming = cards.slice(p.next).find((c) => !c.skipReveal);
    if (!upcoming) {
      update({ stage: 'podium' });
      setFast(false);
      return;
    }
    if (rarityIndex(upcoming.rarity) >= cardPack.RARE) {
      setFast(false);
      void flip();
      return;
    }
    const id = setTimeout(() => void flip(), reduced ? 30 : 140);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fast, stage, p.next, busy]);

  useEffect(() => {
    if (stage === 'stack' && p.next >= cards.length && cards.length > 0) update({ stage: 'podium' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, p.next, cards.length]);

  // The result appears as soon as the podium does; no extra click.
  useEffect(() => {
    if (stage === 'podium' && session && !session.completed) void finish();
  }, [stage, session, finish]);

  const revealed = cards.slice(0, p.next).filter((c) => !c.skipReveal);
  const skipped = cards.slice(0, p.next).filter((c) => c.skipReveal).length;

  if (stage === 'sealed') {
    return (
      <div className="stage">
        <p className="muted small">
          Play streak: {streak} {streak === 1 ? 'day' : 'days'}
          {newCardPriority ? ' · New-card priority is active: unowned cards come first.' : ` · New-card priority from day 7.`}
        </p>
        <div
          className="pack"
          role="button"
          tabIndex={0}
          aria-label="Sealed pack. Press Enter to tear it open."
          onClick={open}
          onKeyDown={onActivateKey(open)}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientY - rect.top < rect.height * 0.25) tear.current = { x: e.clientX, width: rect.width };
          }}
          onPointerUp={(e) => {
            if (tear.current && Math.abs(e.clientX - tear.current.x) > tear.current.width * 0.5) void open();
            tear.current = null;
          }}
        >
          <div className="pack-tear">- - - tear here - - -</div>
          <div className="pack-body">
            <strong>Mystery Card Pack</strong>
            <span>12 cards · 1 Rare or better</span>
          </div>
        </div>
        <p className="muted small">Drag across the top edge to tear it open, or tap the pack.</p>
      </div>
    );
  }

  if (stage === 'stack') {
    const remaining = cards.length - p.next;
    return (
      <div className="stage">
        {rising !== null ? (
          <div className="rare-moment" style={glowStyle(rarityIndex(cards[rising].rarity) / 5, tierColor(cardPack.CARD_RARITIES, cards[rising].rarity))}>
            <div className="tcg-card back rising">?</div>
            <p className="muted">Something rare is rising…</p>
          </div>
        ) : (
          <button type="button" className="stack" onClick={flip} disabled={busy} aria-label={`Flip the next card (${remaining} left)`}>
            <span className="stack-count">{remaining}</span>
            <span className="small">cards left</span>
          </button>
        )}
        <div className="row-actions">
          <button type="button" className="primary" onClick={flip} disabled={busy}>
            Flip next card
          </button>
          <button type="button" onClick={() => setFast(true)} disabled={busy || fast}>
            Reveal the rest
          </button>
        </div>
        {skipped > 0 && <p className="muted small">{skipped} already collected</p>}
        <div className="revealed-cards">
          {revealed.map((c, i) => (
            <CardFace key={`${c.cardId}-${i}`} card={c} small />
          ))}
        </div>
      </div>
    );
  }

  const podium = session?.view.podium ?? [];
  return (
    <div className="stage">
      <h2 className="section-title">Podium</h2>
      <div className="podium">
        {podium.map((index, place) => {
          const card = cards[index];
          return (
            <div key={index} className={`podium-place place-${place + 1}`}>
              <CardFace card={card} />
              {!card.isNew && <span className="badge muted">Owned</span>}
              <span className="podium-rank">{place + 1}</span>
            </div>
          );
        })}
      </div>
      <details className="pack-list">
        <summary>All 12 cards</summary>
        <div className="revealed-cards">
          {cards.map((c, i) => (
            <CardFace key={`${c.cardId}-${i}`} card={c} small />
          ))}
        </div>
      </details>
    </div>
  );
}
