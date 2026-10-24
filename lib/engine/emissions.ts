import { FUEL } from "@/config/fuel";
import type { Powertrain } from "@/types";

/**
 * Tailpipe CO2 only. A battery EV is zero at the tailpipe.
 * A plug-in's published grams-per-mile already mixes petrol and electric miles
 * on the EPA test, so the driver's own petrol miles scale that figure.
 */
export function tailpipeLbs(input: {
  powertrain: Powertrain;
  annualMiles: number;
  gasMiles: number;
  gramsPerMile: number;
}): number {
  if (input.powertrain === "bev" || input.gramsPerMile <= 0) return 0;
  const miles = input.powertrain === "phev" ? input.gasMiles : input.annualMiles;
  if (miles <= 0) return 0;
  return (miles * input.gramsPerMile) / FUEL.gramsPerPound;
}
