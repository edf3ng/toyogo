/**
 * Depreciation assumptions. Industry rules of thumb, not Toyota or EPA data.
 * Every field is listed in the assumptions panel.
 */
export const VALUATION = {
  /** Share of MSRP remaining after the first year (about a 20% drop). */
  yearOneRetention: 0.8,
  /** Remaining-value multiplier for each year from the start of year 2 through year 5. */
  yearsTwoToFive: 0.88,
  /** Remaining-value multiplier for each year after year 5. */
  beyondFive: 0.92,
  expectedMilesPerYear: 12_000,
  /** Cents of value per mile under the expected odometer. $0.10/mi. */
  mileageRateCents: 10,
  retailLowFactor: 0.94,
  retailHighFactor: 1.06,
  /** Trade-in is this fraction under the modelled base value. */
  tradeInDiscount: 0.13,
  /**
   * Returning a lease is set aside when equity is above this, because the
   * turn-in would give that equity away. $200.
   */
  equityForfeitFloorCents: 20_000,
} as const;

/** Example deductions, in cents, for condition notes the driver checked. */
export const CONDITION_CENTS = {
  accident: 80_000,
  tires: 40_000,
  brakes: 30_000,
  warning: 50_000,
} as const;

export function conditionDeductionCents(issues: readonly string[] = []): number {
  return issues.reduce((sum, issue) => {
    const deduction = CONDITION_CENTS[issue as keyof typeof CONDITION_CENTS];
    return sum + (deduction ?? 0);
  }, 0);
}
