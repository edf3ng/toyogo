/**
 * Example finance terms. None of these are Toyota Financial Services rates,
 * fees, or policy. They exist so the demo can show a payment beside a fuel bill.
 */
export const FINANCE = {
  exampleApr: 0.069,
  exampleTermMonths: 72,
  refinanceApr: 0.072,
  /** Refinance is set aside unless the new payment is lower by at least $15. */
  refinanceMinSavingsCents: 1_500,
  deferralMonths: 1,
  /** Payoff or refinance at or above this routes to a specialist. $5,000. */
  followUpThresholdCents: 500_000,
  /** Example fee for turning a lease in. */
  dispositionFeeCents: 35_000,
  horizonMonths: 60,
} as const;
