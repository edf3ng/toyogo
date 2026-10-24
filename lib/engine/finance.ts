import type { Cents, LeaseContract } from "@/types";

/**
 * Standard amortizing payment. `principalCents` is an integer of cents.
 * A zero rate splits the principal evenly so a 0% example still returns a number.
 */
export function monthlyPaymentCents(
  principalCents: Cents,
  annualRate: number,
  months: number,
): Cents {
  if (months <= 0 || principalCents <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.round(principalCents / months);
  const payment = (principalCents * r) / (1 - Math.pow(1 + r, -months));
  return Math.round(payment);
}

/** Remaining principal after `monthsElapsed` payments, rounded to cents. */
export function remainingBalanceCents(
  principalCents: Cents,
  annualRate: number,
  months: number,
  monthsElapsed: number,
): Cents {
  if (monthsElapsed <= 0) return Math.max(0, Math.round(principalCents));
  if (months <= 0 || monthsElapsed >= months) return 0;
  const r = annualRate / 12;
  if (r === 0) {
    return Math.max(0, Math.round(principalCents - (principalCents / months) * monthsElapsed));
  }
  const payment = (principalCents * r) / (1 - Math.pow(1 + r, -months));
  const growth = Math.pow(1 + r, monthsElapsed);
  const balance = principalCents * growth - (payment * (growth - 1)) / r;
  return Math.max(0, Math.round(balance));
}

export function totalInterestCents(
  principalCents: Cents,
  annualRate: number,
  months: number,
): Cents {
  if (months <= 0 || principalCents <= 0) return 0;
  return monthlyPaymentCents(principalCents, annualRate, months) * months - principalCents;
}

/**
 * Lease payment = depreciation + rent charge.
 * Rent charge uses the money factor on (cap cost + residual), which is the
 * usual lease worksheet. The payoff itself is a stored quote, not this formula.
 */
export function leaseMonthlyCents(lease: LeaseContract): Cents {
  if (lease.months <= 0) return 0;
  const depreciation = (lease.capCostCents - lease.residualCents) / lease.months;
  const rent = (lease.capCostCents + lease.residualCents) * lease.moneyFactor;
  return Math.max(0, Math.round(depreciation + rent));
}
