import { type ComponentType, useCallback, useMemo } from 'react';
import { BOARDS, GAMES, GAMES_PER_DAY, type GameId } from '@luckdle/game-logic';
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
  const picks = snapshot.board.length;
  const full = picks >= GAMES_PER_DAY;
  const unplayed = snapshot.board.filter((s) => !snapshot.sessions[s.game]);
  // Not on the board and no room: the player must swap out an unplayed pick (or has played all five).
  const blocked = !session && !onBoard && full;
  const backTab = onBoard || session ? 'mine' : info.board;

  return (
    <div className="game-screen">
      <p>
        <a href={backTab === 'mine' ? '#/board' : `#/board/${backTab}`}>{backTab === 'mine' ? '← My board' : `← ${BOARDS[info.board].name}`}</a>
      </p>
      <h1 className="game-title">{info.name}</h1>
      {!session && <p className="muted game-tagline">{info.tagline}</p>}

      {!session && (
        <div className="board-status">
          {onBoard ? (
            <>
              <span className="badge ready">On your board</span>
              <button type="button" className="link" onClick={() => run((s) => s.removePick(game))}>
                Remove from board
              </button>
            </>
          ) : !full ? (
            <>
              <span className="muted small">
                Not on your board yet ({picks}/{GAMES_PER_DAY} picked). Playing adds it automatically.
              </span>
              <button type="button" onClick={() => run((s) => s.addPick(game))}>
                Add to my board
              </button>
            </>
          ) : unplayed.length > 0 ? (
            <div className="swap">
              <p className="small">Your board is full. Swap out an unplayed game to play this one:</p>
              <div className="row-actions">
                {unplayed.map((slot) => (
                  <button key={slot.game} type="button" onClick={() => run((s) => s.swapPick(slot.game, game))}>
                    Swap out {GAMES[slot.game].name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="small">You’ve played all five games today. A new board opens at the reset.</p>
          )}
        </div>
      )}

      {!blocked && (
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
