import { useRef, useState } from 'react';
import { labelClass } from '../ui.tsx';
import {
  cardTitle,
  combinedReading,
  type DeckCard,
  interpretation,
  newDeck,
  outlook,
  POSITIONS,
} from './deck.ts';

/**
 * One-time tarot introduction for first-time visitors. Lives only in this
 * browser: progress is saved so an interruption resumes the same reading;
 * completing or skipping dismisses it permanently (temporary data discarded).
 */

const STORAGE_KEY = 'luckdle.tarot.v1';
const SHUFFLES = 3;
const TRAVEL = 40; // px of vertical travel that counts as one half of a shuffle

type Stage = 'welcome' | 'shuffle' | 'select' | 'reveal' | 'reading' | 'outlook';

interface InProgress {
  status: 'in-progress';
  stage: Stage;
  shuffles: number;
  deck: DeckCard[];
  /** Grid positions picked, in spread order. */
  picks: number[];
}

type TarotState = InProgress | { status: 'completed' | 'skipped' };

function read(): TarotState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TarotState) : null;
  } catch {
    return null;
  }
}

function write(state: TarotState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the reading still works for this visit.
  }
}

/** Whether the introduction still needs to be shown. */
export function tarotPending(): boolean {
  const s = read();
  return !s || s.status === 'in-progress';
}

/** Playtest: forget completion so the introduction shows again. */
export function resetTarot() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function Tarot({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<InProgress>(() => {
    const s = read();
    if (s && s.status === 'in-progress') return s;
    const fresh: InProgress = { status: 'in-progress', stage: 'welcome', shuffles: 0, deck: newDeck(), picks: [] };
    write(fresh);
    return fresh;
  });

  const update = (patch: Partial<InProgress>) => {
    const next = { ...state, ...patch };
    write(next);
    setState(next);
  };

  const end = (status: 'completed' | 'skipped') => {
    write({ status });
    onDone();
  };

  const position = POSITIONS[Math.min(state.picks.length, 2)];
  const spread = state.picks.map((i) => state.deck[i]);

  return (
    <div className="tarot">
      <div className="tarot-top">
        <span className="muted small">Welcome reading</span>
        <button type="button" className="link" onClick={() => end('skipped')}>
          Skip to the games
        </button>
      </div>

      {state.stage === 'welcome' && (
        <section className="tarot-panel">
          <h1>Welcome to Luckdle</h1>
          <p>
            Before you test your luck, the cards have something to say. This is a one-time welcome reading: three cards for the
            atmosphere, the obstacle, and the guidance. Take your time — nothing moves on until you do.
          </p>
          <p className="muted small">The reading is separate from the games and never changes their odds.</p>
          <button type="button" className="primary big" onClick={() => update({ stage: 'shuffle' })}>
            Begin
          </button>
        </section>
      )}

      {state.stage === 'shuffle' && (
        <Shuffle count={state.shuffles} onShuffle={() => update({ shuffles: Math.min(SHUFFLES, state.shuffles + 1) })} onContinue={() => update({ stage: 'select' })} />
      )}

      {state.stage === 'select' && (
        <section>
          <h2 className="tarot-prompt">Choose a card for the {position}</h2>
          <SpreadSlots spread={spread} />
          <ul className="tarot-grid" aria-label="78 face-down cards">
            {state.deck.map((_, i) => {
              const taken = state.picks.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`tarot-back${taken ? ' taken' : ''}`}
                    disabled={taken}
                    aria-label={taken ? `Card ${i + 1} (chosen)` : `Card ${i + 1}`}
                    onClick={() => update({ picks: [...state.picks, i], stage: 'reveal' })}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {state.stage === 'reveal' && (
        <section className="tarot-panel">
          <p className="muted small">The {POSITIONS[state.picks.length - 1]}</p>
          <TarotFace card={spread[spread.length - 1]} />
          <p>{interpretation(spread[spread.length - 1], POSITIONS[state.picks.length - 1])}</p>
          <button
            type="button"
            className="primary big"
            onClick={() => update({ stage: state.picks.length < 3 ? 'select' : 'reading' })}
          >
            {state.picks.length < 3 ? `Choose the ${POSITIONS[state.picks.length]}` : 'Read the spread'}
          </button>
        </section>
      )}

      {state.stage === 'reading' && (
        <section className="tarot-panel">
          <SpreadSlots spread={spread} />
          <h2>{combinedReading(spread).title}</h2>
          <p>{combinedReading(spread).text}</p>
          <button type="button" className="primary big" onClick={() => update({ stage: 'outlook' })}>
            Your outlook
          </button>
        </section>
      )}

      {state.stage === 'outlook' && (
        <section className="tarot-panel">
          <p className="muted small">Your outlook</p>
          <p className={`result-label ${labelClass(outlook(spread))}`}>{outlook(spread)}</p>
          <p className="muted small">[Placeholder outlook values — upright/reversed weighted by position.]</p>
          <button type="button" className="primary big" onClick={() => end('completed')}>
            Enter Luckdle
          </button>
        </section>
      )}
    </div>
  );
}

function TarotFace({ card }: { card: DeckCard }) {
  return (
    <div className={`tarot-face${card.reversed ? ' reversed' : ''}`}>
      <span>{cardTitle(card)}</span>
    </div>
  );
}

function SpreadSlots({ spread }: { spread: DeckCard[] }) {
  return (
    <ol className="spread">
      {POSITIONS.map((pos, i) => (
        <li key={pos}>
          <span className="muted small">{pos}</span>
          {spread[i] ? <span className="spread-card">{cardTitle(spread[i])}</span> : <span className="spread-card empty">—</span>}
        </li>
      ))}
    </ol>
  );
}

/** Three up-and-down shuffles by dragging the deck (mouse or touch), with a keyboard button. No cut. */
function Shuffle({ count, onShuffle, onContinue }: { count: number; onShuffle: () => void; onContinue: () => void }) {
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ start: number; extreme: number; dir: 1 | -1 | 0; halves: number; id: number } | null>(null);
  const done = count >= SHUFFLES;

  return (
    <section className="tarot-panel">
      <h2>Shuffle the deck</h2>
      <p>Move the deck up and down three times.</p>
      <div
        className="shuffle-area"
        onPointerDown={(e) => {
          if (done) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { start: e.clientY, extreme: e.clientY, dir: 0, halves: 0, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          setOffset(Math.max(-80, Math.min(80, e.clientY - d.start)));
          const moved = e.clientY - d.extreme;
          if (d.dir === 0) {
            if (Math.abs(moved) >= TRAVEL) {
              // First half of a shuffle (up or down); the return trip completes it.
              d.dir = moved > 0 ? 1 : -1;
              d.extreme = e.clientY;
              d.halves = 1;
            }
            return;
          }
          if ((d.dir === 1 && e.clientY > d.extreme) || (d.dir === -1 && e.clientY < d.extreme)) {
            d.extreme = e.clientY; // still moving the same way
          } else if (Math.abs(moved) >= TRAVEL) {
            // Reversed direction far enough: one half of a shuffle.
            d.dir = d.dir === 1 ? -1 : 1;
            d.extreme = e.clientY;
            d.halves++;
            if (d.halves % 2 === 0) onShuffle();
          }
        }}
        onPointerUp={() => {
          drag.current = null;
          setOffset(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setOffset(0);
        }}
      >
        <div className="deck" style={{ transform: `translateY(${offset}px)` }} aria-hidden>
          <div className="tarot-back" />
          <div className="tarot-back" />
          <div className="tarot-back" />
        </div>
      </div>
      <p className="shuffle-count" aria-live="polite">
        {Math.min(count, SHUFFLES)} / {SHUFFLES} shuffles
      </p>
      {done ? (
        <button type="button" className="primary big" onClick={onContinue}>
          Lay out the cards
        </button>
      ) : (
        <button type="button" onClick={onShuffle}>
          Shuffle once (keyboard)
        </button>
      )}
    </section>
  );
}
