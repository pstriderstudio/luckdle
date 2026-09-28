/** Small shared UI helpers. */
import { useEffect, useState } from 'react';
import type { LuckLabel } from '@luckdle/game-logic';
import type { ResultSummary } from './service/types.ts';

export function formatScore(score: number): string {
  return score >= 99 && score < 100 ? score.toFixed(2) : score.toFixed(1);
}

export function formatOneIn(probability: number): string {
  if (!(probability > 0)) return '';
  const n = 1 / probability;
  if (n < 10) return n.toFixed(1).replace(/\.0$/, '');
  return Math.round(n).toLocaleString('en-US');
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const LABEL_BLURBS: Record<LuckLabel, string> = {
  Jinxed: 'Not your day — the luck gods owe you one.',
  Unlucky: 'A little short of luck this time.',
  'Fair Luck': 'Right down the middle.',
  Lucky: 'Fortune smiled on you.',
  Charmed: 'Charmed! Everything lined up.',
};

export function labelClass(label: LuckLabel): string {
  return `label-${label.toLowerCase().replace(' ', '-')}`;
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Waits `ms` (or a short fade in reduced-motion mode). */
export function pause(ms: number, reduced: boolean): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, reduced ? Math.min(ms, 150) : ms));
}

export function ResultCard({ result, unit, onBack }: { result: ResultSummary; unit?: string; onBack: () => void }) {
  const oneIn = formatOneIn(result.probability);
  return (
    <section className={`result ${labelClass(result.label)}`} aria-live="polite">
      <p className="result-headline">{result.headline}</p>
      {oneIn && (
        <p className="result-odds">
          About 1 in {oneIn}
          {unit ? ` ${unit}` : ''}
        </p>
      )}
      <p className="result-label">{result.label}</p>
      <p className="result-score">
        Luck score <strong>{formatScore(result.score)}</strong> / 100
      </p>
      <p className="result-blurb">{LABEL_BLURBS[result.label]}</p>
      <button type="button" className="primary" onClick={onBack}>
        Back to my board
      </button>
    </section>
  );
}
