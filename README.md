# Luckdle

A daily website of chance-based luck games. Product decisions live in [TODO.md](TODO.md); the stack is recorded in [ADR 0001](docs/adr/0001-tech-stack.md).

## Layout

| Path | What it is |
| --- | --- |
| `packages/game-logic` | Shared TypeScript: outcome distributions, rankings, the 0–100 luck score, labels, the 3 AM Eastern game day, daily score and share card, board rules. Runs in Deno (Edge Functions), browsers, and Node. |
| `apps/web` | React + Vite web app: tarot welcome, boards, the eleven games, collection, and daily report (placeholder visuals and names). |
| `packages/game-logic/src/engine` | The game engine shared by the browser playtest and the server ([ADR 0002](docs/adr/0002-shared-game-engine.md)). |
| `supabase` | Postgres migrations and the `game` Edge Function (runs the engine over Postgres). |

## Getting started

```sh
npm install
npm test          # game-logic tests (probability and score tables from TODO.md)
npm run typecheck
npm run dev       # web app on http://localhost:5173
```

### Running with the Supabase backend (local)

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Supabase CLI](https://supabase.com/docs/guides/local-development) (`brew install supabase/tap/supabase`).

```sh
npm run supabase:start       # Postgres, Auth, and the Edge Runtime in Docker; applies supabase/migrations
npm run supabase:functions   # syncs the game engine and serves the `game` function (leave running)
cp apps/web/.env.example apps/web/.env.local   # paste the anon key from `supabase status`
npm run dev
```

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set, the web app signs players in anonymously and every action goes through the `game` Edge Function; without them it falls back to the browser playtest. In local development the dev-tools bar offers **Next day** (the function only honours it when `LUCKDLE_ALLOW_DAY_OFFSET=true`, set in `supabase/functions.dev.env`).

## Playtest mode

Without Supabase configured, the web app runs in **playtest mode**: `LocalGameService` (`apps/web/src/service/localService.ts`) runs the same game engine in the browser and keeps everything in `localStorage`. It is not cheat-proof; it exists so the games, boards, collection, report, and tarot introduction can be played and judged.

The pink playtest bar at the bottom offers **Next day** (moves this browser to the next game day), **Reset today**, **Reset all**, and **Replay tarot**. All names, descriptions, art, and tarot readings are placeholders.

## Rules of the road

- In production, official outcomes are generated only by the `game` Edge Function with `secureRng()` and saved before any reveal; responses contain only revealed data. The browser playtest is for design work only.
- `packages/game-logic` must stay Deno-compatible: explicit `.ts` import extensions and no Node-only APIs.
- Item names (cards, characters, fish, curios, gems, plants) are placeholders; their identifiers are stable and must never be reused.
