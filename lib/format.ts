import type { Cents } from "@/types";

/** Whole dollars. Engine values stay in cents until they reach this file. */
export function formatDollars(cents: Cents): string {
  const dollars = Math.round(cents / 100);
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatSignedDollars(cents: Cents): string {
  if (cents === 0) return formatDollars(0);
  const prefix = cents > 0 ? "+" : "−";
  return `${prefix}${formatDollars(Math.abs(cents))}`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPounds(pounds: number): string {
  return `${formatNumber(Math.round(pounds))} lb`;
}

export function formatPercent(rate: number): string {
  return `${formatNumber(rate * 100, 1)}%`;
}

export function dollarsToCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function parseDollars(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}
