/** Test helper: an in-process Postgres (PGlite) loaded with the Supabase migrations. */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { SqlClient } from '../src/engine/sqlStore.ts';

const MIGRATIONS = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

// Minimal stand-ins for what Supabase provides (auth schema, roles).
const SUPABASE_STUB = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean not null default true);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
`;

export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const open = new Set<PGlite>();

/** Closes every database opened by startPostgres (call from afterEach). */
export async function closeAllPostgres() {
  await Promise.all([...open].map((db) => db.close()));
  open.clear();
}

export async function startPostgres(): Promise<{ db: PGlite; client: SqlClient; addUsers(ids: string[], anonymous?: boolean): Promise<void> }> {
  const db = new PGlite();
  open.add(db);
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    const sql = readFileSync(MIGRATIONS + file, 'utf8');
    // pg_cron is not available in PGlite; the schedule is Supabase-only.
    if (sql.includes('pg_cron')) continue;
    await db.exec(sql);
  }
  const wrap = (q: { query: PGlite['query'] }): SqlClient => ({
    query: async (text, params) => (await q.query(text, params)).rows as never[],
    transaction: () => {
      throw new Error('Nested transactions are not supported');
    },
  });
  const client: SqlClient = {
    query: async (text, params) => (await db.query(text, params)).rows as never[],
    transaction: (fn) => db.transaction((tx) => fn(wrap(tx))),
  };
  return {
    db,
    client,
    async addUsers(ids, anonymous = true) {
      for (const id of ids) {
        await db.query('insert into auth.users (id, is_anonymous) values ($1, $2) on conflict do nothing', [id, anonymous]);
      }
    },
  };
}
