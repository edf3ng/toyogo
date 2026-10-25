import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStore, accounts } from "./accounts";
import { GET, POST, PUT, DELETE } from "@/app/api/account/route";
import { NextRequest } from "next/server";
import { buildTrip } from "@/lib/trip";
import { modelsForYear } from "@/lib/garage";
import { PRIORITY_KEYS } from "@/config/priorities";

function profile(miles = 40000) {
  return buildTrip({
    name: "Driver", zip: "78704", car: modelsForYear(2019)[0], miles,
    finance: "loan", monthsElapsed: 12, loanMonths: 60, apr: 0.049,
    principalCents: 2800000, payoffCents: 0, statedPaymentCents: 42500,
    budgetCents: 70000, charge: "yes", dailyMiles: 30, priorities: [...PRIORITY_KEYS],
    paint: "#123456", other: "More cargo space", issues: ["tires"],
    acquired: null, purchasedOn: "2025-01", agreementName: "loan.pdf",
  });
}

describe("JSON accounts", () => {
  let directory: string;
  let filename: string;
  let store: AccountStore;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "toyogo-accounts-"));
    filename = path.join(directory, "accounts.json");
    store = new AccountStore(filename);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it("persists accounts and restores the correct profile after reopening storage", async () => {
    const saved = profile();
    const signup = await store.signup("Driver@Example.com", "MyDriver", "secret123", saved);
    expect(signup.account.driver).toEqual({ email: "driver@example.com", name: "MyDriver" });
    const reopened = new AccountStore(filename);
    const login = await reopened.login(" DRIVER@example.com ", "secret123");
    expect(login.account.trip).toEqual({ ...saved, name: "MyDriver" });
    expect(await reopened.session(login.token)).toEqual(login.account);
    const raw = await readFile(filename, "utf8");
    expect(raw).not.toContain("secret123");
    expect(raw).not.toContain(login.token);
    expect(JSON.stringify(login.account)).not.toContain("passwordHash");
  });

  it("rejects incorrect passwords, unknown accounts, and duplicate emails", async () => {
    await store.signup("driver@example.com", "Driver", "correct", profile());
    await expect(store.login("driver@example.com", "wrong")).rejects.toMatchObject({ status: 401 });
    await expect(store.login("unknown@example.com", "correct")).rejects.toMatchObject({ status: 401 });
    await expect(store.signup("DRIVER@example.com", "Other", "correct", profile())).rejects.toMatchObject({ status: 409 });
  });

  it("updates only the authenticated user's profile and keeps a blank password unchanged", async () => {
    const first = await store.signup("one@example.com", "One", "password1", profile(10000));
    const second = await store.signup("two@example.com", "Two", "password2", profile(20000));
    const updated = await store.update(first.token, "new@example.com", "Renamed", "", profile(75000));
    expect(updated.driver.name).toBe("Renamed");
    expect((await store.login("new@example.com", "password1")).account.trip.input.current.miles).toBe(75000);
    expect((await store.session(second.token))?.trip.input.current.miles).toBe(20000);
    await expect(store.update(undefined, "new@example.com", "Oops", "", profile())).rejects.toMatchObject({ status: 401 });
    await expect(store.update(first.token, "two@example.com", "Oops", "", profile())).rejects.toMatchObject({ status: 409 });
  });

  it("can change passwords and invalidate the old password", async () => {
    const { token } = await store.signup("driver@example.com", "Driver", "old-password", profile());
    await store.update(token, "driver@example.com", "Driver", "new-password", profile());
    await expect(store.login("driver@example.com", "old-password")).rejects.toMatchObject({ status: 401 });
    await expect(store.login("driver@example.com", "new-password")).resolves.toHaveProperty("token");
  });

  it("signs out without deleting the saved account and expires old sessions", async () => {
    const { token } = await store.signup("driver@example.com", "Driver", "password", profile());
    await store.logout(token);
    expect(await store.session(token)).toBeNull();
    const login = await store.login("driver@example.com", "password");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(await store.session(login.token)).toBeNull();
  });

  it("serializes simultaneous signups without losing accounts", async () => {
    await Promise.all([
      store.signup("one@example.com", "One", "password1", profile(10000)),
      store.signup("two@example.com", "Two", "password2", profile(20000)),
    ]);
    expect((await store.login("one@example.com", "password1")).account.trip.input.current.miles).toBe(10000);
    expect((await store.login("two@example.com", "password2")).account.trip.input.current.miles).toBe(20000);
  });

  it("replaces the previous browser session when switching accounts", async () => {
    const first = await store.signup("one@example.com", "One", "password1", profile());
    await store.signup("two@example.com", "Two", "password2", profile());
    const second = await store.login("two@example.com", "password2", first.token);
    expect(await store.session(first.token)).toBeNull();
    expect((await store.session(second.token))?.driver.name).toBe("Two");
  });

  it("validates account and profile input before writing records", async () => {
    await expect(store.signup("invalid", "Driver", "password", profile())).rejects.toMatchObject({ status: 400 });
    await expect(store.signup("driver@example.com", " ", "password", profile())).rejects.toMatchObject({ status: 400 });
    await expect(store.signup("driver@example.com", "Driver", "", profile())).rejects.toMatchObject({ status: 400 });
    await expect(store.signup("driver@example.com", "Driver", "password", {})).rejects.toMatchObject({ status: 400 });
  });

  it("handles signup, authenticated retrieval, editing, login, and logout through the API", async () => {
    vi.spyOn(accounts, "signup").mockImplementation(store.signup.bind(store));
    vi.spyOn(accounts, "login").mockImplementation(store.login.bind(store));
    vi.spyOn(accounts, "session").mockImplementation(store.session.bind(store));
    vi.spyOn(accounts, "update").mockImplementation(store.update.bind(store));
    vi.spyOn(accounts, "logout").mockImplementation(store.logout.bind(store));
    const request = (method: string, body?: unknown, token?: string) => new NextRequest("http://localhost/api/account", {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Cookie: `toyogo-session=${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

    expect(await (await GET(request("GET"))).json()).toEqual({ account: null });
    const response = await POST(request("POST", {
      action: "signup", email: "driver@example.com", username: "Driver", password: "secret", trip: profile(),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const token = response.cookies.get("toyogo-session")!.value;
    const initial = await (await GET(request("GET", undefined, token))).json();
    expect(initial.account.trip.input.current.miles).toBe(40000);
    expect(JSON.stringify(initial)).not.toContain("passwordHash");

    const update = await PUT(request("PUT", {
      email: "driver@example.com", username: "NewName", password: "", trip: profile(99000),
    }, token));
    expect(update.status).toBe(200);
    expect((await update.json()).account.driver.name).toBe("NewName");
    const signout = await DELETE(request("DELETE", undefined, token));
    expect(signout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await (await GET(request("GET", undefined, token))).json()).toEqual({ account: null });
    expect((await PUT(request("PUT", { email: "driver@example.com", username: "Driver", trip: profile() }, token))).status).toBe(401);

    const wrong = await POST(request("POST", { action: "login", email: "driver@example.com", password: "wrong" }));
    expect(wrong.status).toBe(401);
    const login = await POST(request("POST", { action: "login", email: "driver@example.com", password: "secret" }));
    expect(login.status).toBe(200);
    expect((await login.json()).account.trip.input.current.miles).toBe(99000);
  });
});
