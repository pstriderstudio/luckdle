/**
 * @luckdle/game-logic — outcome distributions, rankings, scores, and labels
 * shared by the Edge Functions (Deno) and tests. The web client uses it for
 * display only; official outcomes are generated on the server.
 *
 * Imports use explicit .ts extensions and no Node-only APIs so Deno can load
 * the sources directly.
 */
export * from './luck.ts';
export * from './rng.ts';
export * from './gameDay.ts';
export * from './items.ts';
export * from './catalog.ts';
export * from './daily.ts';
export * from './board.ts';
export * from './collections.ts';

// Game engine shared by the browser playtest and the Supabase Edge Function.
export * from './engine/api.ts';
export * from './engine/store.ts';
export * from './engine/memoryStore.ts';
export * from './engine/sqlStore.ts';
export { collectionOf, GameEngine, GameError, type PlayerContext, validateRequest } from './engine/engine.ts';
export * as rules from './engine/rules.ts';

export * as dice from './games/dice.ts';
export * as cardPack from './games/cardPack.ts';
export * as dailySummon from './games/dailySummon.ts';
export * as luckyFishing from './games/luckyFishing.ts';
export * as coinStreak from './games/coinStreak.ts';
export * as fallingStar from './games/fallingStar.ts';
export * as threeChests from './games/threeChests.ts';
export * as wishingWell from './games/wishingWell.ts';
export * as gemBreaker from './games/gemBreaker.ts';
export * as luckyNumber from './games/luckyNumber.ts';
export * as gardenOfChance from './games/gardenOfChance.ts';
