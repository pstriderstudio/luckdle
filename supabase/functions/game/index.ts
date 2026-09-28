// The Luckdle game service. POST a ServiceRequest (see
// packages/game-logic/src/engine/api.ts) with the player's Supabase access
// token; the response is { snapshot, session? } or { error }.
//
// Outcomes are generated here with a cryptographically secure RNG and saved
// before anything is revealed; responses contain only revealed data.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GameEngine, GameError, gameDayOf, shiftGameDay, SqlStore } from '../_shared/game-logic/index.ts';
import { postgresClient } from './db.ts';

const client = postgresClient(Deno.env.get('SUPABASE_DB_URL')!);

const engine = new GameEngine(new SqlStore(client));
const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
  auth: { persistSession: false },
});

// Local testing only: lets the playtest “Next day” button shift the game day.
const allowDayOffset = Deno.env.get('LUCKDLE_ALLOW_DAY_OFFSET') === 'true';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-luckdle-day-offset',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign-in required' }, 401);
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign-in required' }, 401);

  const body = await req.json().catch(() => null);
  const now = new Date();
  const offset = allowDayOffset ? Math.max(0, Math.min(365, Number(req.headers.get('x-luckdle-day-offset')) || 0)) : 0;
  const gameDay = shiftGameDay(gameDayOf(now), offset);

  try {
    return json(await engine.handle({ playerId: data.user.id, gameDay, now }, body));
  } catch (e) {
    if (e instanceof GameError) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
