import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { GameService, Snapshot } from './types.ts';

interface Store {
  service: GameService;
  snapshot: Snapshot | null;
  error: string | null;
  clearError(): void;
  /** Runs a service call, refreshes the snapshot, and reports errors. Returns the call's value or undefined on error. */
  run<T>(fn: (service: GameService) => Promise<T>): Promise<T | undefined>;
  refresh(): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ service, children }: { service: GameService; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSnapshot(await service.snapshot());
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async <T,>(fn: (s: GameService) => Promise<T>) => {
      try {
        const value = await fn(service);
        setError(null);
        await refresh();
        return value;
      } catch (e) {
        setError((e as Error).message);
        await refresh();
        return undefined;
      }
    },
    [service, refresh],
  );

  const value = useMemo<Store>(
    () => ({ service, snapshot, error, clearError: () => setError(null), run, refresh }),
    [service, snapshot, error, run, refresh],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
