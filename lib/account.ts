import { clearDriver, writeDriver, type Driver } from "@/lib/driver";
import { clearTrip, writeTrip, type SavedTrip } from "@/lib/trip";

export const ACCOUNT_CHANGED = "toyogo-account-changed";
export interface Account {
  driver: Driver;
  trip: SavedTrip;
}

let accountVersion = 0;

function cacheAccount(account: Account | null) {
  if (account) {
    writeDriver(account.driver);
    writeTrip(account.trip);
  } else {
    clearDriver();
    clearTrip();
  }
  window.dispatchEvent(new Event(ACCOUNT_CHANGED));
}

async function requestAccount(method: string, body?: unknown, signal?: AbortSignal) {
  // A response from an earlier page load must not overwrite a newer login/logout.
  const version = method === "GET" ? accountVersion : ++accountVersion;
  const response = await fetch("/api/account", {
    method, cache: "no-store", signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as { account: Account | null; error?: string };
  if (!response.ok) throw new Error(result.error || "Could not complete the account request.");
  if (!signal?.aborted && version === accountVersion) cacheAccount(result.account);
  return result.account;
}

export function loadAccount(signal?: AbortSignal) {
  return requestAccount("GET", undefined, signal);
}

export async function login(email: string, password: string) {
  return requestAccount("POST", { action: "login", email, password });
}

export async function saveAccount(details: { email: string; username: string; password: string; trip: SavedTrip }, editing: boolean) {
  return requestAccount(editing ? "PUT" : "POST", { ...details, action: "signup" });
}

export function logout() {
  return requestAccount("DELETE");
}
