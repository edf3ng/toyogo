export const DRIVER_KEY = "toyogo-driver";

export interface Driver {
  name: string;
  email: string;
}

export function readDriver(): Driver | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRIVER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Driver;
    if (!parsed?.name || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDriver(driver: Driver) {
  sessionStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
}

export function clearDriver() {
  sessionStorage.removeItem(DRIVER_KEY);
}
