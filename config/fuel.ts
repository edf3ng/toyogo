import type { DriveMix, FuelPrices } from "@/types";

/**
 * Fuel and electricity assumptions. Gas prices on screen come from the EPA
 * cache when it is available. The electricity rate does not — it varies by
 * state, so it stays an explicit assumption.
 */
export const FUEL = {
  mix: {
    city: { city: 0.75, highway: 0.25 },
    highway: { city: 0.25, highway: 0.75 },
    /** Same city/highway split the EPA combined test uses. */
    mix: { city: 0.55, highway: 0.45 },
  } satisfies Record<DriveMix, { city: number; highway: number }>,
  /** 16¢ per kWh. Residential rates vary widely; this is not a quote. */
  electricityRateCentsPerKwh: 16,
  /**
   * Share of a plug-in hybrid's miles assumed to run on a charge.
   * This is not an EPA utility factor.
   */
  phevElectricShare: 0.45,
  gramsPerPound: 453.592,
} as const;

/** FuelEconomy.gov /fuelprices on 2026-10-24. The cache replaces this at runtime. */
export const FALLBACK_FUEL_PRICES: FuelPrices = {
  regular: 4.28,
  midgrade: 4.92,
  premium: 5.31,
  diesel: 6.28,
  electric: 0.15,
};
