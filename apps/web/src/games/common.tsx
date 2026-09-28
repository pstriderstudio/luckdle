import { type CSSProperties, type KeyboardEvent, useCallback, useRef, useState } from 'react';
import type { GameId } from '@luckdle/game-logic';
import type { GameAction, GameSession, ItemType, Progress, StartInput } from '../service/types.ts';
import { tierStrength } from '../items.ts';

export interface GameProps<G extends GameId> {
  session: GameSession<G> | undefined;
  start(input?: StartInput): Promise<GameSession<G> | undefined>;
  act(action: GameAction): Promise<GameSession<G> | undefined>;
  save(progress: Progress): void;
  finish(): Promise<void>;
  reduced: boolean;
  /** First obtained today (collection “New”). */
  isNewItem(type: ItemType, id: string): boolean;
  streak: number;
  newCardPriority: boolean;
}

/** Local reveal state initialised from (and saved to) the session's progress. */
export function useSavedProgress<T extends Progress>(
  session: { progress: Progress } | undefined,
  save: (p: Progress) => void,
  initial: T,
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(() => ({ ...initial, ...(session?.progress ?? {}) }) as T);
  const latest = useRef(state);
  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setState(next);
      save(next);
    },
    [save],
  );
  return [state, update];
}

const PALETTE = ['#9a93b5', '#58c47d', '#4f9dff', '#b46cff', '#ff9a3c', '#ffd34d'];

/** Placeholder colour for a tier, spread over the palette by rarity. */
export function tierColor(tiers: readonly string[], tier: string): string {
  const i = Math.round(tierStrength(tiers, tier) * (PALETTE.length - 1));
  return PALETTE[i];
}

/** Style variables for a rarity glow (0 = none … 1 = strongest). */
export function glowStyle(strength: number, color = '#ffd34d'): CSSProperties {
  return { '--glow': strength, '--glow-color': color } as CSSProperties;
}

export function NewBadge() {
  return <span className="badge new">New</span>;
}

/** Runs a handler on Enter or Space. */
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}
