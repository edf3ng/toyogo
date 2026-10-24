/**
 * Energy assumptions. Electricity figures are state averages, not a household bill.
 * Cents per kWh, labelled as such in the assumptions panel.
 */
export const ENERGY = {
  drivingDaysPerYear: 250,
  /** Used when the EPA national price has not loaded. */
  fallbackGasDollarsPerGallon: 4.28,
  defaultElectricityCentsPerKwh: 16,
  /** EIA-style residential averages, in cents per kWh. Example figures. */
  stateElectricityCents: {
    TX: 14.5,
    CA: 29,
    NY: 22,
    default: 16,
  } as Record<string, number>,
} as const;

export function electricityCentsForState(state: string | null | undefined): number {
  if (!state) return ENERGY.defaultElectricityCentsPerKwh;
  return ENERGY.stateElectricityCents[state] ?? ENERGY.stateElectricityCents.default;
}
