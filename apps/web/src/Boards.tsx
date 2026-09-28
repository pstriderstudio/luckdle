import { type ReactNode, useState } from 'react';
import { BOARD_IDS, BOARDS, type BoardId, GAMES, GAMES_PER_DAY, type GameId } from '@luckdle/game-logic';
import { useStore } from './service/store.tsx';
import { navigate } from './route.ts';
import { formatCountdown, useNow } from './ui.tsx';

type Tab = 'mine' | BoardId;

/** Personal board (home) plus the four category boards. Boards never show results. */
export function Boards({ tab }: { tab: Tab }) {
  const { snapshot, run } = useStore();
  const now = useNow();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  if (!snapshot) return null;
  const { board, sessions } = snapshot;
  const picked = new Set(board.map((s) => s.game));
  const allPlayed = board.length === GAMES_PER_DAY && board.every((s) => sessions[s.game]?.completed);

  const pick = async (game: GameId) => {
    await run((s) => s.addPick(game));
  };

  return (
    <div>
      <nav className="tabs" role="tablist" aria-label="Boards">
        <TabButton id="mine" current={tab}>
          My board <span className="count">{board.length}/{GAMES_PER_DAY}</span>
        </TabButton>
        {BOARD_IDS.map((id) => (
          <TabButton key={id} id={id} current={tab}>
            {BOARDS[id].name}
          </TabButton>
        ))}
      </nav>

      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'mine' ? (
          <section>
            {board.length === 0 && (
              <p className="hint">Pick up to five games from the boards above. Each gets one official play today.</p>
            )}
            <ul className="grid personal">
              {Array.from({ length: GAMES_PER_DAY }, (_, i) => {
                const slot = board[i];
                if (!slot) {
                  return (
                    <li key={`empty-${i}`} className="panel empty">
                      <button type="button" className="add" onClick={() => navigate({ screen: 'board', tab: 'arena' })} aria-label="Add a game">
                        +
                      </button>
                    </li>
                  );
                }
                const game = GAMES[slot.game];
                const session = sessions[slot.game];
                const state = session?.completed ? 'Played' : session ? 'In progress' : 'Ready';
                return (
                  <li
                    key={slot.game}
                    className={`panel${dragFrom === i ? ' dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragEnd={() => setDragFrom(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFrom !== null && dragFrom !== i) void run((s) => s.movePick(dragFrom, i));
                      setDragFrom(null);
                    }}
                  >
                    <h2>{game.name}</h2>
                    <p>{game.tagline}</p>
                    <span className={`badge ${session?.completed ? 'played' : 'ready'}`}>{state}</span>
                    <div className="actions">
                      <button type="button" className="primary" onClick={() => navigate({ screen: 'game', game: slot.game })}>
                        {session?.completed ? 'View' : session ? 'Resume' : 'Play'}
                      </button>
                      {!slot.played && (
                        <button type="button" onClick={() => run((s) => s.removePick(slot.game))}>
                          Remove
                        </button>
                      )}
                      <button type="button" aria-label={`Move ${game.name} earlier`} disabled={i === 0} onClick={() => run((s) => s.movePick(i, i - 1))}>
                        ←
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${game.name} later`}
                        disabled={i === board.length - 1}
                        onClick={() => run((s) => s.movePick(i, i + 1))}
                      >
                        →
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {allPlayed && (
              <p className="all-played">
                All five played. A new board opens in{' '}
                <strong>{formatCountdown(new Date(snapshot.nextReset).getTime() - now.getTime())}</strong>.{' '}
                <a href="#/report">See today’s report</a>
              </p>
            )}
            {board.some((s) => !s.played) && (
              <button type="button" className="clear" onClick={() => run((s) => s.clearBoard())}>
                Clear board
              </button>
            )}
          </section>
        ) : (
          <ul className="grid">
            {BOARDS[tab].games.map((id) => {
              const game = GAMES[id];
              const isPicked = picked.has(id);
              const full = board.length >= GAMES_PER_DAY;
              return (
                <li key={id} className="panel">
                  <button
                    type="button"
                    className="pick"
                    disabled={isPicked || full}
                    onClick={() => pick(id)}
                    aria-label={isPicked ? `${game.name} (picked)` : `Add ${game.name} to my board`}
                  >
                    <h2>{game.name}</h2>
                    <p>{game.tagline}</p>
                    {isPicked ? (
                      <span className="badge picked">Picked</span>
                    ) : full ? (
                      <span className="badge muted">Board full</span>
                    ) : (
                      <span className="badge add-badge">+ Add</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton(props: { id: Tab; current: Tab; children: ReactNode }) {
  const selected = props.id === props.current;
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${props.id}`}
      aria-selected={selected}
      className={selected ? 'tab selected' : 'tab'}
      onClick={() => navigate({ screen: 'board', tab: props.id })}
    >
      {props.children}
    </button>
  );
}
