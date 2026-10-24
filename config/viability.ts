/** Gate thresholds for the hybrid / plug-in / EV verdict. */
export const VIABILITY = {
  /** A gate under this makes the verdict "Not yet". */
  notYetBelow: 0.4,
  /** Every applicable gate must reach this for a clean "Viable". */
  viableAt: 0.7,
  paybackTargetMonths: 60,
  /** BEV range must cover daily miles times this margin. */
  rangeMargin: 1.25,
  /** Payment more than this far above budget is removed before scoring. */
  budgetHardLimit: 0.25,
  /** Station count that saturates the charging gate when there is no home charger. */
  stationCap: 8,
  multiplier: {
    viable: 1,
    caveats: 0.75,
    notYet: 0.3,
  },
} as const;
