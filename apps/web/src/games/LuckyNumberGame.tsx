import { type FormEvent, useEffect, useState } from 'react';
import { luckyNumber } from '@luckdle/game-logic';
import type { GameProps } from './common.tsx';

export function LuckyNumberGame({ session, start, act, finish }: GameProps<'lucky-number'>) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const view = session?.view;

  useEffect(() => {
    if (session && view?.solved && !session.completed) void finish();
  }, [session, view?.solved, finish]);

  if (!view) {
    return (
      <div className="stage">
        <p>
          A secret number from 0 to 9999 is waiting. You’ll see how many digits it has. Each guess tells you higher or lower, and any
          digit in the right place is revealed. The average careful player needs {luckyNumber.REFERENCE_MEAN.toFixed(1)} guesses.
        </p>
        <button type="button" className="primary big" onClick={() => start()}>
          Start
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed) || trimmed.length !== view.digits || (trimmed.length > 1 && trimmed.startsWith('0'))) {
      setError(`Enter a ${view.digits}-digit number${view.digits > 1 ? ' (no leading zero)' : ''}.`);
      return;
    }
    setError(null);
    const s = await act({ type: 'guess', value: Number(trimmed) });
    if (s) setInput('');
  };

  const last = view.guesses[view.guesses.length - 1];
  return (
    <div className="stage">
      <div className="digits" aria-label={`Secret number, ${view.digits} digits`}>
        {view.revealed.map((d, i) => (
          <span key={i} className={d === null ? 'digit hidden' : 'digit revealed'}>
            {d ?? '_'}
          </span>
        ))}
      </div>
      {!view.solved && (
        <p className="number-range" aria-live="polite">
          {view.range.min === view.range.max ? (
            <>
              It must be <strong>{view.range.min}</strong>
            </>
          ) : (
            <>
              Somewhere from <strong>{view.range.min}</strong> to <strong>{view.range.max}</strong>
            </>
          )}
        </p>
      )}
      {last && !view.solved && (
        <p className="reveal-line" aria-live="polite">
          {last.guess}: go {last.feedback === 'higher' ? 'higher ↑' : 'lower ↓'}
        </p>
      )}
      {view.solved && <p className="reveal-line hit">Correct!</p>}
      {!view.solved && (
        <form className="guess-form" onSubmit={submit}>
          <label>
            Your guess
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={view.digits}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
              autoFocus
              aria-invalid={error ? true : undefined}
            />
          </label>
          <button type="submit" className="primary">
            Guess
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {view.guesses.length > 0 && (
        <ol className="guess-history">
          {view.guesses.map((g, i) => (
            <li key={i}>
              {g.guess} — {g.feedback === 'correct' ? 'correct' : g.feedback === 'higher' ? 'higher' : 'lower'}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
