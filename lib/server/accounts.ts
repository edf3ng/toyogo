import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Driver } from "@/lib/driver";
import type { SavedTrip } from "@/lib/trip";

const scrypt = promisify(scryptCallback);
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  trip: SavedTrip;
}

interface Store {
  users: User[];
  sessions: { tokenHash: string; userId: string; expiresAt: number }[];
}

export interface Account {
  driver: Driver;
  trip: SavedTrip;
}

export class AccountError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function identity(email: unknown, username: unknown) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new AccountError("Enter a valid email address.");
  }
  if (typeof username !== "string" || !username.trim()) {
    throw new AccountError("Enter a username.");
  }
  return { email: email.trim().toLowerCase(), username: username.trim() };
}

function passwordInput(password: unknown): asserts password is string {
  if (typeof password !== "string" || !password.length || password.length > 128) {
    throw new AccountError("Enter a password between 1 and 128 characters.");
  }
}

function profileInput(trip: unknown): asserts trip is SavedTrip {
  const value = trip as SavedTrip | null;
  if (!value || typeof value !== "object" || typeof value.zip !== "string" ||
      !value.input?.current || typeof value.input.current.id !== "string" ||
      !["owned", "loan", "lease"].includes(value.input.contract?.kind) ||
      !Array.isArray(value.input.priorities)) {
    throw new AccountError("Complete the vehicle and driving details before saving.");
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function matchesPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const hash = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicAccount(user: User): Account {
  return { driver: { name: user.username, email: user.email }, trip: user.trip };
}

/** Single-process JSON storage. Queue updates and atomically replace the file. */
export class AccountStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private filename: string) {}

  private async read(): Promise<Store> {
    try {
      return JSON.parse(await readFile(this.filename, "utf8")) as Store;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { users: [], sessions: [] };
      throw error;
    }
  }

  private transact<T>(operation: (store: Store) => Promise<T> | T): Promise<T> {
    const result = this.queue.then(async () => {
      const store = await this.read();
      store.sessions = store.sessions.filter((session) => session.expiresAt > Date.now());
      const value = await operation(store);
      await mkdir(path.dirname(this.filename), { recursive: true });
      const temporary = `${this.filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(store, null, 2), { mode: 0o600 });
      await rename(temporary, this.filename);
      return value;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  private userFor(store: Store, token?: string) {
    const session = token && store.sessions.find((item) => item.tokenHash === tokenHash(token));
    return session ? store.users.find((user) => user.id === session.userId) : undefined;
  }

  private startSession(store: Store, user: User, previousToken?: string) {
    if (previousToken) store.sessions = store.sessions.filter((item) => item.tokenHash !== tokenHash(previousToken));
    const token = randomBytes(32).toString("hex");
    store.sessions.push({ tokenHash: tokenHash(token), userId: user.id, expiresAt: Date.now() + SESSION_SECONDS * 1000 });
    return { account: publicAccount(user), token };
  }

  signup(email: unknown, username: unknown, password: unknown, trip: unknown, previousToken?: string) {
    return this.transact(async (store) => {
      const info = identity(email, username);
      passwordInput(password);
      profileInput(trip);
      if (store.users.some((user) => user.email === info.email)) {
        throw new AccountError("An account with this email already exists. Log in instead.", 409);
      }
      const user: User = {
        id: randomUUID(), ...info, passwordHash: await hashPassword(password),
        trip: { ...trip, name: info.username },
      };
      store.users.push(user);
      return this.startSession(store, user, previousToken);
    });
  }

  login(email: unknown, password: unknown, previousToken?: string) {
    return this.transact(async (store) => {
      passwordInput(password);
      const user = typeof email === "string"
        ? store.users.find((item) => item.email === email.trim().toLowerCase()) : undefined;
      if (!user || !(await matchesPassword(password, user.passwordHash))) {
        throw new AccountError("Email or password is incorrect.", 401);
      }
      return this.startSession(store, user, previousToken);
    });
  }

  async session(token?: string): Promise<Account | null> {
    await this.queue;
    const store = await this.read();
    store.sessions = store.sessions.filter((item) => item.expiresAt > Date.now());
    const user = this.userFor(store, token);
    return user ? publicAccount(user) : null;
  }

  update(token: string | undefined, email: unknown, username: unknown, password: unknown, trip: unknown) {
    return this.transact(async (store) => {
      const user = this.userFor(store, token);
      if (!user) throw new AccountError("Please log in again before saving your changes.", 401);
      const info = identity(email, username);
      profileInput(trip);
      if (store.users.some((item) => item.id !== user.id && item.email === info.email)) {
        throw new AccountError("An account with this email already exists.", 409);
      }
      if (password !== undefined && password !== "") {
        passwordInput(password);
        user.passwordHash = await hashPassword(password);
      }
      Object.assign(user, info, { trip: { ...trip, name: info.username } });
      return publicAccount(user);
    });
  }

  logout(token?: string) {
    return this.transact((store) => {
      if (token) store.sessions = store.sessions.filter((item) => item.tokenHash !== tokenHash(token));
    });
  }
}

// Share the write queue across route bundles and development hot reloads.
const shared = globalThis as typeof globalThis & { toyogoAccounts?: AccountStore };
export const accounts = shared.toyogoAccounts ??= new AccountStore(path.join(process.cwd(), "data", "accounts.json"));
