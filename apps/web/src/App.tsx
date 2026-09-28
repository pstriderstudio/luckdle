import { useState } from 'react';
import { GAMES_PER_DAY } from '@luckdle/game-logic';
import { useStore } from './service/store.tsx';
import { navigate, useRoute } from './route.ts';
import { formatCountdown, useNow } from './ui.tsx';
import { Boards } from './Boards.tsx';
import { GameScreen } from './games/GameScreen.tsx';
import { Collection } from './Collection.tsx';
import { Report } from './Report.tsx';
import { resetTarot, Tarot, tarotPending } from './tarot/Tarot.tsx';

export function App() {
  const route = useRoute();
  const { snapshot, error, clearError } = useStore();
  const [showTarot, setShowTarot] = useState(tarotPending);
  // Bumped by playtest controls so screens remount with fresh state.
  const [epoch, setEpoch] = useState(0);

  if (showTarot) {
    return (
      <Tarot
        onDone={() => {
          setShowTarot(false);
          // First-time visitors land on the category boards with an empty personal board.
          navigate({ screen: 'board', tab: 'arena' });
        }}
      />
    );
  }

  if (!snapshot) return <p className="loading">Loading…</p>;
  const played = snapshot.board.filter((s) => snapshot.sessions[s.game]?.completed).length;

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#/board">
          Luckdle
        </a>
        <nav className="main-nav" aria-label="Main">
          <a href="#/board" aria-current={route.screen === 'board' ? 'page' : undefined}>
            Board
          </a>
          <a href="#/collection" aria-current={route.screen === 'collection' ? 'page' : undefined}>
            Collection{snapshot.collection.some((c) => c.isNew) && <span className="dot" aria-label="new items" />}
          </a>
          <a href="#/report" aria-current={route.screen === 'report' ? 'page' : undefined}>
            {snapshot.report ? 'Report' : `Report ${played}/${GAMES_PER_DAY}`}
          </a>
        </nav>
        <Countdown nextReset={snapshot.nextReset} />
      </header>

      {error && (
        <p className="message" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={clearError}>
            Dismiss
          </button>
        </p>
      )}

      <main key={`${epoch}-${snapshot.gameDay}`}>
        {route.screen === 'board' && <Boards tab={route.tab} />}
        {route.screen === 'game' && <GameScreen game={route.game} />}
        {route.screen === 'collection' && <Collection />}
        {route.screen === 'report' && <Report />}
      </main>

      <PlaytestBar
        onChanged={() => setEpoch((e) => e + 1)}
        onReplayTarot={() => {
          resetTarot();
          setShowTarot(true);
        }}
      />
    </div>
  );
}

function Countdown({ nextReset }: { nextReset: string }) {
  const now = useNow();
  return (
    <p className="reset" title="Everyone’s board resets at 3:00 AM US Eastern">
      Reset in <time dateTime={nextReset}>{formatCountdown(new Date(nextReset).getTime() - now.getTime())}</time>
    </p>
  );
}

function PlaytestBar({ onChanged, onReplayTarot }: { onChanged: () => void; onReplayTarot: () => void }) {
  const { service, snapshot, run } = useStore();
  const pt = service.playtest;
  if (!pt || !snapshot) return null;
  const act = async (fn: () => Promise<void>) => {
    await run(fn);
    onChanged();
  };
  return (
    <footer className="playtest" aria-label="Playtest controls">
      <span>
        <strong>Playtest</strong>
        <span className="playtest-note"> · outcomes are generated in this browser</span> · day {snapshot.gameDay}
        {snapshot.playtest?.dayOffset ? ` (+${snapshot.playtest.dayOffset})` : ''}
      </span>
      <span className="playtest-actions">
        <button type="button" onClick={() => act(pt.nextDay)}>
          Next day
        </button>
        <button type="button" onClick={() => act(pt.resetToday)}>
          Reset today
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Erase all playtest data (boards, results, collection)?')) void act(pt.resetAll);
          }}
        >
          Reset all
        </button>
        <button type="button" onClick={onReplayTarot}>
          Replay tarot
        </button>
      </span>
    </footer>
  );
}
