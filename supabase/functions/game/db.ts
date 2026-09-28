// Adapts postgres.js to the engine's SqlClient interface.
import postgres from 'npm:postgres@3.4.9';
import type { SqlClient } from '../_shared/game-logic/index.ts';

export function postgresClient(url: string, { max = 3 }: { max?: number } = {}): SqlClient {
  const sql = postgres(url, { prepare: false, max });
  const wrap = (q: postgres.Sql | postgres.TransactionSql): SqlClient => ({
    query: (text, params = []) => q.unsafe(text, params as never[]) as never,
    transaction: () => {
      throw new Error('Nested transactions are not supported');
    },
  });
  return {
    query: wrap(sql).query,
    transaction: (fn) => sql.begin((tx) => fn(wrap(tx))) as never,
  };
}
