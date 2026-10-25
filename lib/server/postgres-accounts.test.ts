import { PGlite, type Transaction } from "@electric-sql/pglite";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore, createAccountStore } from "./accounts";
import { createPostgresPersistence } from "./postgres-accounts";
import { buildTrip } from "@/lib/trip";
import { modelsForYear } from "@/lib/garage";
import { PRIORITY_KEYS } from "@/config/priorities";

vi.mock("postgres", () => ({ default: vi.fn() }));

function profile(miles = 40000) {
  return buildTrip({
    name: "Driver", zip: "78704", car: modelsForYear(2019)[0], miles,
    finance: "owned", monthsElapsed: 0, loanMonths: 60, apr: 0.049,
    principalCents: 0, payoffCents: 0, statedPaymentCents: 0,
    budgetCents: 70000, charge: "yes", dailyMiles: 30, priorities: [...PRIORITY_KEYS],
    paint: "#123456", other: "", issues: [], acquired: "used", purchasedOn: "2020-06", agreementName: "",
  });
}

describe("Postgres account storage", () => {
  let db: PGlite;

  // Adapt the driver's template calls to real embedded Postgres queries.
  // No Neon credentials or production data are used in these tests.
  function queryClient(connection: PGlite | Transaction) {
    const query = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.reduce((sql, part, index) => sql + (index ? `$${index}` : "") + part, "");
      // Match Postgres.js JSONB parameter encoding, including its treatment of strings.
      const params = values.map((value) => {
        if (value && typeof value === "object" && "jsonValue" in value) return JSON.stringify(value.jsonValue);
        if (typeof value === "string" && /SET data = \$\d/.test(query)) return JSON.stringify(value);
        return value;
      });
      return (await connection.query(query, params)).rows;
    };
    return Object.assign(query, { json: (jsonValue: unknown) => ({ jsonValue }) });
  }

  beforeAll(async () => { db = await PGlite.create(); }, 20000);
  afterAll(async () => { await db.close(); });
  beforeEach(async () => {
    await db.exec("DROP TABLE IF EXISTS toyogo_account_store");
    const sql = Object.assign(queryClient(db), {
      begin: <T>(callback: (tx: ReturnType<typeof queryClient>) => Promise<T>) =>
        db.transaction((tx) => callback(queryClient(tx))),
    });
    vi.mocked(postgres).mockReturnValue(sql as unknown as ReturnType<typeof postgres>);
  });

  it("creates its table and shares profiles/sessions across independent server instances", async () => {
    const first = new AccountStore("", createPostgresPersistence("postgres://test"));
    expect(await first.session()).toBeNull();
    const { token } = await first.signup("Driver@Example.com", "Driver", "password", profile());
    const second = new AccountStore("", createPostgresPersistence("postgres://test"));
    expect((await second.session(token))?.trip.input.current.miles).toBe(40000);
    await second.update(token, "driver@example.com", "Updated", "", profile(72000));
    const login = await first.login("driver@example.com", "password");
    expect(login.account.driver.name).toBe("Updated");
    expect(login.account.trip.input.current.miles).toBe(72000);
    await second.logout(login.token);
    expect(await first.session(login.token)).toBeNull();
  });

  it("rolls back failed changes and keeps the database usable", async () => {
    const persistence = createPostgresPersistence("postgres://test");
    await expect(persistence.transact((store) => {
      store.sessions.push({ tokenHash: "should-not-survive", userId: "bad", expiresAt: Date.now() });
      throw new Error("Cancel change");
    })).rejects.toThrow("Cancel change");
    expect((await persistence.read()).sessions).toEqual([]);
    const store = new AccountStore("", persistence);
    await store.signup("driver@example.com", "Driver", "password", profile());
    await expect(store.signup("driver@example.com", "Duplicate", "password", profile())).rejects.toMatchObject({ status: 409 });
    expect((await persistence.read()).users).toHaveLength(1);
    await expect(store.login("driver@example.com", "password")).resolves.toHaveProperty("token");
  });

  it("preserves simultaneous signups from separate store instances", async () => {
    const one = new AccountStore("", createPostgresPersistence("postgres://test"));
    const two = new AccountStore("", createPostgresPersistence("postgres://test"));
    await Promise.all([
      one.signup("one@example.com", "One", "password1", profile(10000)),
      two.signup("two@example.com", "Two", "password2", profile(20000)),
    ]);
    expect((await two.login("one@example.com", "password1")).account.trip.input.current.miles).toBe(10000);
    expect((await one.login("two@example.com", "password2")).account.trip.input.current.miles).toBe(20000);
  });

  it("selects DATABASE_URL and refuses to use local files on Vercel without configuration", async () => {
    const store = createAccountStore({ DATABASE_URL: "postgres://pooled", VERCEL: "1" });
    await store.session();
    expect(postgres).toHaveBeenLastCalledWith("postgres://pooled", expect.objectContaining({ prepare: false }));
    await expect(createAccountStore({ VERCEL: "1" }).session()).rejects.toMatchObject({ status: 503 });
    await expect(createAccountStore({ VERCEL: "1" }).login("test@example.com", "password")).rejects.toMatchObject({ status: 503 });
  });

  it("repairs double-encoded records and continues storing JSON objects", async () => {
    const first = new AccountStore("", createPostgresPersistence("postgres://test"));
    const { token } = await first.signup("driver@example.com", "Driver", "password", profile());
    await db.exec("UPDATE toyogo_account_store SET data = to_jsonb(data::text)");
    const repaired = new AccountStore("", createPostgresPersistence("postgres://test"));
    expect((await repaired.session(token))?.driver.name).toBe("Driver");
    await repaired.update(token, "driver@example.com", "Driver", "", profile(88000));
    expect((await repaired.login("driver@example.com", "password")).account.trip.input.current.miles).toBe(88000);
    const { rows } = await db.query<{ type: string }>("SELECT jsonb_typeof(data) AS type FROM toyogo_account_store");
    expect(rows[0].type).toBe("object");
  });
});
