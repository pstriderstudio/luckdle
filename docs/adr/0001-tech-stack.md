# 0001: TypeScript web app with Capacitor, backed by Supabase

- Status: Accepted
- Date: 2026-09-28

## Context

Luckdle is web-first but must work well on Android and iOS browsers, with native store apps later. Every official result must be generated and stored on the server: players must not be able to generate, alter, replay, or peek at results (hidden chest contents, the Lucky Number). Players start anonymously and can optionally sign in later without losing history. Daily standings reset at 3:00 AM US Eastern.

## Decision

- **Client:** a TypeScript web app (React + Vite, built as a static single-page app and installable PWA). Game scenes that need rich animation render with Canvas/WebGL. Store apps later wrap the same build with **Capacitor**.
- **Backend:** **Supabase**.
  - Postgres for players, daily boards, saved results, collections, and standings.
  - Supabase Auth anonymous sign-ins on first visit, linkable later to email/Google/Apple.
  - Edge Functions (TypeScript) are the only code that generates outcomes, using a cryptographically secure RNG. Clients request actions ("roll", "reveal next card") and receive only what has been revealed.
  - Row-level security: players read only their own revealed data and can never write results directly. A unique constraint on (player, game day, game) enforces one official result per play.
  - A scheduled job finalises each game day's standings at the 3 AM Eastern reset.
- **Shared game logic:** outcome distributions, rankings, scores, and labels live in one TypeScript package used by the Edge Functions and by tests; the client uses it only for display.
- **Web hosting:** static hosting (e.g. Cloudflare Pages or Vercel); chosen at deploy time.

## Alternatives considered

- **Flutter** for web and native apps from one codebase: rejected for now because Flutter web's large initial download slows the first visit (the tarot introduction), and the product is web-first.
- **Own Node server + Postgres** (e.g. on Fly.io): more control but more upkeep; Supabase covers auth, database, functions, and scheduling for a solo project while remaining standard Postgres.

## Consequences

- Store apps are a wrapped web app rather than fully native; acceptable for these games.
- Every game action is a server round-trip; reveal animations should start from saved outcomes and tolerate latency.
- Supabase Edge Functions run on Deno, so the shared game-logic package must avoid Node-only APIs.
