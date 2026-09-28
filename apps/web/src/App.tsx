import { type ReactNode, useEffect, useState } from 'react';
import {
  addPick,
  BOARD_IDS,
  BOARDS,
  type BoardId,
  carryOver,
  clearBoard,
  GAMES,
  GAMES_PER_DAY,
  type GameId,
  gameDayOf,
  moveSlot,
  nextReset,
  type PersonalBoard,
  removePick,
} from '@luckdle/game-logic';

/**
 * Board shell. The personal board is kept in browser storage until the
 * Supabase-backed board (per anonymous player) is wired up. Games are not
 * playable yet, and boards never show results.
 */

const STORAGE_KEY = 'luckdle.board.v0';

interface StoredBoard {
  gameDay: string;
  slots: PersonalBoard;
}

function loadBoard(today: string): PersonalBoard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredBoard;
    return stored.gameDay === today ? stored.slots : carryOver(stored.slots);
  } catch {
    return [];
  }
}

function saveBoard(gameDay: string, slots: PersonalBoard) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gameDay, slots } satisfies StoredBoard));
  } catch {
    // Storage unavailable (private mode); the board still works for this visit.
  }
}

function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Tab = 'mine' | BoardId;

export function App() {
  const now = useNow();
  const today = gameDayOf(now);
  const [gameDay, setGameDay] = useState(today);
  const [board, setBoard] = useState<PersonalBoard>(() => loadBoard(today));
  const [tab, setTab] = useState<Tab>(() => (board.length === 0 ? 'arena' : 'mine'));
  const [message, setMessage] = useState<string | null>(null);

  // Roll over to the new game day at the 3 AM Eastern reset.
  useEffect(() => {
    if (today !== gameDay) {
      setGameDay(today);
      setBoard((b) => carryOver(b));
    }
  }, [today, gameDay]);

  useEffect(() => saveBoard(gameDay, board), [gameDay, board]);

  const update = (fn: (b: PersonalBoard) => PersonalBoard) => {
    try {
      setBoard(fn(board));
      setMessage(null);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const picked = new Set(board.map((s) => s.game));
  const reset = nextReset(now);

  return (
    <div className="app">
      <header className="header">
        <h1>Luckdle</h1>
        <p className="reset">
          Next reset in <time dateTime={reset.toISOString()}>{formatCountdown(reset.getTime() - now.getTime())}</time>
          <span className="reset-local"> ({reset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} your time)</span>
        </p>
      </header>

      <nav className="tabs" role="tablist" aria-label="Boards">
        <TabButton id="mine" current={tab} onSelect={setTab}>
          My board <span className="count">{board.length}/{GAMES_PER_DAY}</span>
        </TabButton>
        {BOARD_IDS.map((id) => (
          <TabButton key={id} id={id} current={tab} onSelect={setTab}>
            {BOARDS[id].name}
          </TabButton>
        ))}
      </nav>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}

      <main role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'mine' ? (
          <section>
            <ul className="grid personal">
              {Array.from({ length: GAMES_PER_DAY }, (_, i) => {
                const slot = board[i];
                if (!slot) {
                  return (
                    <li key={`empty-${i}`} className="panel empty">
                      <button type="button" className="add" onClick={() => setTab('arena')} aria-label="Add a game">
                        +
                      </button>
                    </li>
                  );
                }
                const game = GAMES[slot.game];
                return (
                  <li key={slot.game} className="panel">
                    <h2>{game.name}</h2>
                    <p>{game.tagline}</p>
                    <span className={`badge ${slot.played ? 'played' : 'ready'}`}>{slot.played ? 'Played' : 'Ready'}</span>
                    <div className="actions">
                      <button type="button" disabled title="Games are not playable yet">
                        Play
                      </button>
                      {!slot.played && (
                        <button type="button" onClick={() => update((b) => removePick(b, slot.game))}>
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Move ${game.name} earlier`}
                        disabled={i === 0}
                        onClick={() => update((b) => moveSlot(b, i, i - 1))}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${game.name} later`}
                        disabled={i === board.length - 1}
                        onClick={() => update((b) => moveSlot(b, i, i + 1))}
                      >
                        →
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {board.some((s) => !s.played) && (
              <button type="button" className="clear" onClick={() => update(clearBoard)}>
                Clear board
              </button>
            )}
          </section>
        ) : (
          <ul className="grid">
            {BOARDS[tab].games.map((id: GameId) => {
              const game = GAMES[id];
              const isPicked = picked.has(id);
              return (
                <li key={id} className="panel">
                  <button
                    type="button"
                    className="pick"
                    disabled={isPicked}
                    onClick={() => update((b) => addPick(b, id))}
                    aria-label={isPicked ? `${game.name} (picked)` : `Add ${game.name} to my board`}
                  >
                    <h2>{game.name}</h2>
                    <p>{game.tagline}</p>
                    {isPicked && <span className="badge picked">Picked</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function TabButton(props: { id: Tab; current: Tab; onSelect: (t: Tab) => void; children: ReactNode }) {
  const selected = props.id === props.current;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${props.id}`}
      aria-selected={selected}
      className={selected ? 'tab selected' : 'tab'}
      onClick={() => props.onSelect(props.id)}
    >
      {props.children}
    </button>
  );
}
