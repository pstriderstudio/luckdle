import { useEffect, useState } from 'react';
import { BOARD_IDS, type BoardId, type GameId, isGameId } from '@luckdle/game-logic';

export type Route =
  | { screen: 'board'; tab: 'mine' | BoardId }
  | { screen: 'game'; game: GameId }
  | { screen: 'collection' }
  | { screen: 'report' };

export function parseRoute(hash: string): Route {
  const [screen, arg] = hash.replace(/^#\/?/, '').split('/');
  if (screen === 'game' && isGameId(arg)) return { screen: 'game', game: arg };
  if (screen === 'collection') return { screen: 'collection' };
  if (screen === 'report') return { screen: 'report' };
  if (screen === 'board' && (BOARD_IDS as readonly string[]).includes(arg)) return { screen: 'board', tab: arg as BoardId };
  return { screen: 'board', tab: 'mine' };
}

export function routeHash(route: Route): string {
  switch (route.screen) {
    case 'game':
      return `#/game/${route.game}`;
    case 'board':
      return route.tab === 'mine' ? '#/board' : `#/board/${route.tab}`;
    default:
      return `#/${route.screen}`;
  }
}

export function navigate(route: Route) {
  const hash = routeHash(route);
  if (location.hash !== hash) location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
