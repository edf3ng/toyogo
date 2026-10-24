import { VIABILITY } from "@/config/viability";
import type { Powertrain } from "@/types";
import type { ChargeAccess } from "@/lib/engine/energy";

export type Verdict = "viable" | "caveats" | "not_yet";

export interface Gates {
  /** Null for a standard hybrid: it never charges. */
  charging: number | null;
  /** Null for a standard hybrid. */
  daily: number | null;
  budget: number;
  equity: number;
  payback: number;
}

export function chargingGate(
  powertrain: Powertrain,
  access: ChargeAccess,
  stationCount: number,
): number | null {
  if (powertrain === "hybrid" || powertrain === "gas") return null;
  if (access === "yes") return 1;
  if (access === "maybe") return 0.7;
  return Math.min(1, Math.max(0, stationCount) / VIABILITY.stationCap);
}

export function dailyGate(
  powertrain: Powertrain,
  dailyMiles: number,
  electricRangeMiles: number,
  bevRangeMiles: number,
): number | null {
  if (powertrain === "hybrid" || powertrain === "gas") return null;
  if (dailyMiles <= 0) return 1;
  if (powertrain === "phev") return Math.min(1, Math.max(0, electricRangeMiles) / dailyMiles);
  const needed = dailyMiles * VIABILITY.rangeMargin;
  if (bevRangeMiles >= needed) return 1;
  return Math.max(0, bevRangeMiles / needed);
}

export function budgetGate(paymentCents: number, budgetCents: number): number {
  if (paymentCents <= budgetCents) return 1;
  if (budgetCents <= 0) return 0;
  return budgetCents / paymentCents;
}

export function equityGate(equityCents: number, priceCents: number): number {
  if (equityCents >= 0) return 1;
  if (priceCents <= 0) return 0;
  return Math.max(0, 1 + equityCents / priceCents);
}

export function paybackGate(months: number): number {
  if (!Number.isFinite(months)) return 0;
  if (months <= VIABILITY.paybackTargetMonths) return 1;
  return Math.min(1, VIABILITY.paybackTargetMonths / months);
}

export function overBudget(paymentCents: number, budgetCents: number): boolean {
  return paymentCents > budgetCents * (1 + VIABILITY.budgetHardLimit);
}

/**
 * Any applicable gate under 0.4 is "Not yet". All at or above 0.7 is "Viable".
 * A plug-in whose electric range is shorter than the daily drive is a caveat
 * even when the ratio itself clears 0.7 — 42 miles against a 55-mile day is
 * the case the demo has to show.
 */
export function verdictFor(gates: Gates, rangeShortOfDaily: boolean): Verdict {
  const applicable = [gates.charging, gates.daily, gates.budget, gates.equity, gates.payback].filter(
    (gate): gate is number => gate !== null,
  );
  if (applicable.some((gate) => gate < VIABILITY.notYetBelow)) return "not_yet";
  if (rangeShortOfDaily) return "caveats";
  if (applicable.every((gate) => gate >= VIABILITY.viableAt)) return "viable";
  return "caveats";
}

export function limitingGate(gates: Gates): keyof Gates | null {
  let name: keyof Gates | null = null;
  let lowest = Infinity;
  for (const key of ["charging", "daily", "budget", "equity", "payback"] as const) {
    const value = gates[key];
    if (value === null) continue;
    if (value < lowest) {
      lowest = value;
      name = key;
    }
  }
  return name;
}

export function viabilityMultiplier(verdict: Verdict): number {
  if (verdict === "viable") return VIABILITY.multiplier.viable;
  if (verdict === "caveats") return VIABILITY.multiplier.caveats;
  return VIABILITY.multiplier.notYet;
}
