/**
 * Example deal terms. Not Toyota Financial Services pricing, and the tax
 * treatment is a state assumption, not a rule.
 */
export const FINANCING = {
  exampleApr: 0.069,
  exampleTermMonths: 72,
  /** Texas-style example rate. Labelled as an assumption in the panel. */
  salesTaxRate: 0.0625,
  allowTradeInTaxCredit: true,
  leaseTaxRate: 0.0625,
  titleFeesCents: 45_000,
  residualPct: 0.55,
} as const;
