// GET /functions/v1/game-day → the current game day and the next reset.
// A minimal function proving the shared package loads in the Edge Runtime.
import { gameDayOf, nextReset } from '../_shared/game-logic.ts';

Deno.serve(() => {
  const now = new Date();
  return Response.json({ gameDay: gameDayOf(now), nextReset: nextReset(now).toISOString() });
});
