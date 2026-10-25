import { readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL in .env.local before importing accounts.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
try {
  const filename = path.resolve(process.argv[2] || "data/accounts.json");
  const source = JSON.parse(await readFile(filename, "utf8"));
  if (!Array.isArray(source.users) || source.users.some((user) =>
    typeof user.id !== "string" || !user.id ||
    typeof user.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim()) ||
    typeof user.username !== "string" || !user.username.trim() ||
    !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(user.passwordHash) || !user.trip?.input?.current
  )) throw new Error("The JSON file must contain valid Toyogo accounts with password hashes and profiles.");

  const result = await sql.begin(async (tx) => {
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
    await tx`
      UPDATE toyogo_account_store SET data = (data #>> '{}')::jsonb
      WHERE jsonb_typeof(data) = 'string'
    `;
    const [row] = await tx`SELECT data FROM toyogo_account_store WHERE id = 1 FOR UPDATE`;
    const store = row.data;
    let imported = 0;
    for (const user of source.users) {
      const email = user.email.trim().toLowerCase();
      if (store.users.some((existing) => existing.id === user.id || existing.email.toLowerCase() === email)) continue;
      // Copy only account fields; existing browser sessions are deliberately not imported.
      store.users.push({ id: user.id, email, username: user.username.trim(), passwordHash: user.passwordHash, trip: user.trip });
      imported++;
    }
    await tx`UPDATE toyogo_account_store SET data = ${tx.json(store)} WHERE id = 1`;
    return { imported, skipped: source.users.length - imported };
  });
  console.log(`Imported ${result.imported} account(s); skipped ${result.skipped} existing account(s). Passwords and profiles preserved. Log in again to start a new session.`);
} catch (error) {
  // Avoid printing connection strings or account contents in CLI output.
  console.error("Account import failed. Check DATABASE_URL, database access, and the JSON file. Error code:", error.code || "INVALID_IMPORT");
  process.exitCode = 1;
} finally {
  await sql.end();
}
