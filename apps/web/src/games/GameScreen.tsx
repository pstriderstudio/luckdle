import { type ComponentType, useCallback, useMemo } from 'react';
import { GAMES, type GameId } from '@luckdle/game-logic';
import { useStore } from '../service/store.tsx';
import type { GameSession, Progress } from '../service/types.ts';
import { navigate } from '../route.ts';
import { ResultCard, useReducedMotion } from '../ui.tsx';
import type { GameProps } from './common.tsx';
import { DiceGame } from './DiceGame.tsx';
import { CardPackGame } from './CardPackGame.tsx';
import { SummonGame } from './SummonGame.tsx';
import { FishingGame } from './FishingGame.tsx';
import { CoinStreakGame } from './CoinStreakGame.tsx';
import { FallingStarGame } from './FallingStarGame.tsx';
import { ThreeChestsGame } from './ThreeChestsGame.tsx';
import { WishingWellGame } from './WishingWellGame.tsx';
import { GemGame } from './GemGame.tsx';
import { CosmicGame } from './CosmicGame.tsx';
import { LuckyNumberGame } from './LuckyNumberGame.tsx';
import { GardenGame } from './GardenGame.tsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<GameId, ComponentType<GameProps<any>>> = {
  'dice-of-destiny': DiceGame,
  'mystery-card-pack': CardPackGame,
  'daily-summon': SummonGame,
  'lucky-fishing': FishingGame,
  'coin-streak': CoinStreakGame,
  'falling-star': FallingStarGame,
  'three-chests': ThreeChestsGame,
  'wishing-well': WishingWellGame,
  'gem-breaker': GemGame,
  'cosmic-alignment': CosmicGame,
  'lucky-number': LuckyNumberGame,
  'garden-of-chance': GardenGame,
};

/** “About 1 in N …” units per game. */
const UNITS: Partial<Record<GameId, string>> = {
  'dice-of-destiny': 'rolls',
  'mystery-card-pack': 'packs',
  'daily-summon': 'summons',
  'lucky-fishing': 'casts',
  'coin-streak': 'runs',
  'falling-star': 'stars',
  'three-chests': 'picks',
  'wishing-well': 'tosses',
  'gem-breaker': 'geodes',
  'cosmic-alignment': 'alignments',
  'garden-of-chance': 'seeds',
};

export function GameScreen({ game }: { game: GameId }) {
  const { snapshot, run, service } = useStore();
  const reduced = useReducedMotion();

  const start = useCallback((input?: Parameters<typeof service.start>[1]) => run((s) => s.start(game, input)), [run, game]);
  const act = useCallback((action: Parameters<typeof service.act>[1]) => run((s) => s.act(game, action)), [run, game]);
  const save = useCallback((p: Progress) => void service.saveProgress(game, p), [service, game]);
  const finish = useCallback(async () => {
    await run((s) => s.finish(game));
  }, [run, game]);

  const today = snapshot?.gameDay;
  const collection = snapshot?.collection;
  const isNewItem = useMemo(() => {
    const firstToday = new Set((collection ?? []).filter((c) => c.firstGameDay === today).map((c) => `${c.type}:${c.itemId}`));
    return (type: string, id: string) => firstToday.has(`${type}:${id}`);
  }, [collection, today]);

  if (!snapshot) return null;
  const info = GAMES[game];
  const session = snapshot.sessions[game] as GameSession | undefined;
  const onBoard = snapshot.board.some((s) => s.game === game);
  const Component = COMPONENTS[game];

  return (
    <div className="game-screen">
      <p>
        <a href="#/board">← My board</a>
      </p>
      <h1 className="game-title">{info.name}</h1>
      {!onBoard && !session ? (
        <div className="stage">
          <p>{info.tagline}</p>
          <p className="muted">Add this game to your board to play it. Each game on your board gets one official play today.</p>
          <button
            type="button"
            className="primary"
            disabled={snapshot.board.length >= 5}
            onClick={() => run((s) => s.addPick(game))}
          >
            {snapshot.board.length >= 5 ? 'Your board is full' : 'Add to my board'}
          </button>
        </div>
      ) : (
        <Component
          // Remount when the game day changes (playtest “next day”).
          key={snapshot.gameDay}
          session={session}
          start={start}
          act={act}
          save={save}
          finish={finish}
          reduced={reduced}
          isNewItem={isNewItem}
          streak={snapshot.streak}
          newCardPriority={snapshot.newCardPriority}
        />
      )}
      {session?.completed && session.result && (
        <ResultCard
          result={game === 'lucky-number' ? { ...session.result, probability: 0 } : session.result}
          unit={UNITS[game]}
          onBack={() => navigate({ screen: 'board', tab: 'mine' })}
        />
      )}
    </div>
  );
}
