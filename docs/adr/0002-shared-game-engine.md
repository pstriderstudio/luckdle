# 0002: One game engine for the browser playtest and the server

- Status: Accepted
- Date: 2026-09-28

## Context

ADR 0001 puts every official outcome in Supabase Edge Functions. While designing and playtesting, the games also need to run without a server, in the browser. Keeping two copies of the rules (a playtest service and a server) would let them drift apart, and the server copy would be the less-tested one.

## Decision

- All game-service rules live in `packages/game-logic/src/engine`: boards (five picks, carry-over, swap and lock rules), starting a game (generate and save the outcome before any reveal), player actions, progress, finishing, the collection, streaks, and the daily report with its percentile.
- The engine talks to storage through a small `EngineStore` interface with an atomic, per-player-per-day transaction (`withDay`).
  - `MemoryStore`: used by tests and by the browser playtest (persisted to `localStorage`).
  - `SqlStore`: Postgres, written against a minimal SQL client so it runs with postgres.js in the Edge Function and with PGlite in tests.
- The web app talks only to a `GameService`. `LocalGameService` (playtest) and `SupabaseGameService` (anonymous sign-in, then the `game` Edge Function) both implement it; `main.tsx` picks one from the environment.
- Public views (`toView`) never include unrevealed data: chest contents before the pick, the Lucky Number secret, and the coin run stay on the server.
- The Edge Function imports a generated copy of the engine (`npm run functions:sync`) so the same code runs under Deno locally and when deployed.

## Consequences

- The engine test suite runs against both the in-memory store and Postgres, so a rule tested once is tested for the server.
- Storage-specific behaviour (row locks, the finalise job, RLS and column privileges) is covered by separate Postgres tests.
- The playtest is not cheat-proof (outcomes are in the browser), which is acceptable for design work only.
