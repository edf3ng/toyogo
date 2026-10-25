import postgres from "postgres";
import type { AccountPersistence, Store } from "./accounts";

/** Keep the small demo's existing account document in a durable JSONB row.
 * Row locks serialize writes across Vercel instances, not just one process.
 */
export function createPostgresPersistence(url: string): AccountPersistence {
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  let initialized: Promise<void> | undefined;

  async function initialize() {
    if (!initialized) {
      initialized = sql.begin(async (tx) => {
        // Serialize first-time setup across independently starting functions.
        await tx`SELECT pg_advisory_xact_lock(742619031)`;
        await tx`
          CREATE TABLE IF NOT EXISTS toyogo_account_store (
            id integer PRIMARY KEY CHECK (id = 1),
            data jsonb NOT NULL
          )
        `;
        await tx`
          INSERT INTO toyogo_account_store (id, data)
          VALUES (1, '{"users":[],"sessions":[]}'::jsonb)
          ON CONFLICT (id) DO NOTHING
        `;
        // Repair records written by the older double-encoding bug without losing data.
        await tx`
          UPDATE toyogo_account_store SET data = (data #>> '{}')::jsonb
          WHERE jsonb_typeof(data) = 'string'
        `;
      }).then(() => undefined).catch((error: unknown) => {
        initialized = undefined;
        throw error;
      });
    }
    await initialized;
  }

  return {
    async read() {
      await initialize();
      const [row] = await sql<{ data: Store }[]>`SELECT data FROM toyogo_account_store WHERE id = 1`;
      return row.data;
    },
    async transact<T>(operation: (store: Store) => Promise<T> | T): Promise<T> {
      await initialize();
      // Use a box so Postgres.js preserves arbitrary callback result types.
      const result = await sql.begin(async (tx) => {
        const [row] = await tx<{ data: Store }[]>`SELECT data FROM toyogo_account_store WHERE id = 1 FOR UPDATE`;
        const value = await operation(row.data);
        await tx`UPDATE toyogo_account_store SET data = ${tx.json(row.data as unknown as postgres.JSONValue)} WHERE id = 1`;
        return { value };
      });
      return result.value;
    },
  };
}
