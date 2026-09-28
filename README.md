# Luckdle

A daily website of chance-based luck games. Product decisions live in [TODO.md](TODO.md); the stack is recorded in [ADR 0001](docs/adr/0001-tech-stack.md).

## Layout

| Path | What it is |
| --- | --- |
| `packages/game-logic` | Shared TypeScript: outcome distributions, rankings, the 0–100 luck score, labels, the 3 AM Eastern game day, daily score and share card, board rules. Runs in Deno (Edge Functions), browsers, and Node. |
| `apps/web` | React + Vite web app (currently the board shell with placeholder panels). |
| `supabase` | Postgres migrations and Edge Functions for the Supabase CLI's local stack. |

## Getting started

```sh
npm install
npm test          # game-logic tests (probability and score tables from TODO.md)
npm run typecheck
npm run dev       # web app on http://localhost:5173
```

Local backend (needs the [Supabase CLI](https://supabase.com/docs/guides/local-development) and Docker):

```sh
supabase start
supabase functions serve
```

## Playtest mode

The web app currently runs in **playtest mode**: `LocalGameService` (`apps/web/src/service/localService.ts`) generates outcomes in the browser with the shared game logic and keeps everything in `localStorage`. It is not cheat-proof; it exists so the games, boards, collection, report, and tarot introduction can be played and judged. The UI talks only to the `GameService` interface, so a Supabase-backed service can replace it in `main.tsx` without UI changes.

The pink playtest bar at the bottom offers **Next day** (moves this browser to the next game day), **Reset today**, **Reset all**, and **Replay tarot**. All names, descriptions, art, and tarot readings are placeholders.

## Rules of the road

- Official outcomes are generated only in Edge Functions with `secureRng()` and saved before any reveal. The web app uses `@luckdle/game-logic` for display only.
- `packages/game-logic` must stay Deno-compatible: explicit `.ts` import extensions and no Node-only APIs.
- Item names (cards, characters, fish, curios, gems, plants) are placeholders; their identifiers are stable and must never be reused.
