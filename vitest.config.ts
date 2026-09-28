import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'apps/**/src/**/*.test.{ts,tsx}'],
    // Postgres-backed tests start an in-process database (PGlite) per test.
    testTimeout: 30_000,
  },
});
