import { useState } from 'react';
import { GAMES, GAMES_PER_DAY } from '@luckdle/game-logic';
import { useStore } from './service/store.tsx';
import { formatCountdown, formatScore, LABEL_BLURBS, labelClass, useNow } from './ui.tsx';

/** Daily report: daily score, label, percentile, per-game rows, and the share card. Tarot is never included. */
export function Report() {
  const { snapshot } = useStore();
  const now = useNow();
  const [copied, setCopied] = useState(false);
  if (!snapshot) return null;
  const { report, board, sessions } = snapshot;
  const played = board.filter((s) => sessions[s.game]?.completed).length;
  const countdown = formatCountdown(new Date(snapshot.nextReset).getTime() - now.getTime());

  if (!report) {
    return (
      <section className="report">
        <h1>Today’s luck</h1>
        <p className="progress-line">
          {played} of {GAMES_PER_DAY} played
        </p>
        <p className="muted">Finish all five games on your board to get your daily luck score and see how you compare.</p>
        <p className="muted small">New board in {countdown}</p>
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="report">
      <h1>Today’s luck</h1>
      <div className={`result ${labelClass(report.label)}`}>
        <p className="result-label">{report.label}</p>
        <p className="result-score">
          Daily luck score <strong>{formatScore(report.dailyScore)}</strong> / 100
        </p>
        <p>
          Luckier than <strong>{Math.round(report.percentile)}%</strong> of players today{report.final ? '' : ' so far'}.
        </p>
        {report.simulatedField && (
          <p className="muted small">Fewer than 20 players have finished, so you’re compared with a simulated field of players.</p>
        )}
        <p className="result-blurb">{LABEL_BLURBS[report.label]}</p>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">Luck</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.gameId}>
              <th scope="row">
                <a href={`#/game/${row.gameId}`}>{GAMES[row.gameId].name}</a>
              </th>
              <td>
                <span className={`label-chip ${labelClass(row.label)}`}>{row.label}</span>
              </td>
              <td>{formatScore(row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="share">
        <pre className="share-text">{report.shareText}</pre>
        <button type="button" className="primary" onClick={copy}>
          {copied ? 'Copied!' : 'Copy share text'}
        </button>
      </div>

      <p className="muted small">
        Leaderboard: signed-in players only (coming with accounts). New board in {countdown}.
      </p>
    </section>
  );
}
