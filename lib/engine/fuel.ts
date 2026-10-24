import { FUEL } from "@/config/fuel";
import type {
  AnnualEnergy,
  Cents,
  DriveMix,
  FuelPrices,
  Powertrain,
  VehicleFacts,
} from "@/types";

export function fuelGrade(fuelType: string): keyof FuelPrices {
  const name = fuelType.toLowerCase();
  if (name.includes("electric")) return "electric";
  if (name.includes("diesel")) return "diesel";
  if (name.includes("premium")) return "premium";
  if (name.includes("midgrade")) return "midgrade";
  return "regular";
}

/**
 * Harmonic blend: gallons are miles divided by mpg, so a city/highway split
 * has to average fuel use, not the mpg figures themselves.
 * SPEC: "weighted" is implemented as the harmonic mean for that reason.
 */
export function blendedMpg(cityMpg: number, highwayMpg: number, mix: DriveMix): number {
  if (cityMpg <= 0 || highwayMpg <= 0) return 0;
  const weights = FUEL.mix[mix];
  return 1 / (weights.city / cityMpg + weights.highway / highwayMpg);
}

export function annualCo2Lbs(annualMiles: number, gramsPerMile: number): number {
  if (annualMiles <= 0 || gramsPerMile <= 0) return 0;
  return (annualMiles * gramsPerMile) / FUEL.gramsPerPound;
}

/** Miles of the current car whose tailpipe CO2 matches `avoidedLbs`. */
export function equivalentMiles(avoidedLbs: number, currentGramsPerMile: number): number {
  if (avoidedLbs <= 0 || currentGramsPerMile <= 0) return 0;
  const lbsPerMile = currentGramsPerMile / FUEL.gramsPerPound;
  return avoidedLbs / lbsPerMile;
}

export function breakEvenMonths(
  monthlyDeltaCents: Cents,
  annualFuelSavingsCents: Cents,
): number | null {
  if (annualFuelSavingsCents <= 0) return null;
  if (monthlyDeltaCents <= 0) return 0;
  return Math.ceil(monthlyDeltaCents / (annualFuelSavingsCents / 12));
}

export function annualEnergy(input: {
  vehicle: Pick<
    VehicleFacts,
    "cityMpg" | "highwayMpg" | "combinedMpg" | "kwhPer100" | "co2TailpipeGpm" | "powertrain" | "fuelType"
  >;
  annualMiles: number;
  mix: DriveMix;
  fuelPrices: FuelPrices;
  electricityRateCentsPerKwh: number;
}): AnnualEnergy {
  const { vehicle, annualMiles, mix, fuelPrices, electricityRateCentsPerKwh } = input;
  const tailpipeOnly = vehicle.powertrain === "bev";
  const co2 = annualCo2Lbs(annualMiles, vehicle.co2TailpipeGpm);

  if (vehicle.powertrain === "bev") {
    const annualKwh = (annualMiles / 100) * vehicle.kwhPer100;
    return {
      powertrain: "bev",
      blendedMpg: 0,
      annualGallons: 0,
      annualKwh,
      annualFuelCostCents: Math.round(annualKwh * electricityRateCentsPerKwh),
      annualCo2Lbs: co2,
      tailpipeOnly,
      electricityRateCentsPerKwh,
      phevElectricShare: 0,
      pricePerGallon: 0,
    };
  }

  const mpg = blendedMpg(vehicle.cityMpg, vehicle.highwayMpg, mix) || vehicle.combinedMpg || 1;
  const grade = fuelGrade(vehicle.fuelType);
  const pricePerGallon = grade === "electric" ? fuelPrices.regular : fuelPrices[grade];

  if (vehicle.powertrain === "phev") {
    const electricMiles = annualMiles * FUEL.phevElectricShare;
    const gasMiles = annualMiles - electricMiles;
    const annualGallons = gasMiles / mpg;
    const annualKwh = (electricMiles / 100) * vehicle.kwhPer100;
    const gasCents = Math.round(annualGallons * pricePerGallon * 100);
    const electricCents = Math.round(annualKwh * electricityRateCentsPerKwh);
    return {
      powertrain: "phev",
      blendedMpg: mpg,
      annualGallons,
      annualKwh,
      annualFuelCostCents: gasCents + electricCents,
      annualCo2Lbs: co2,
      tailpipeOnly: false,
      electricityRateCentsPerKwh,
      phevElectricShare: FUEL.phevElectricShare,
      pricePerGallon,
    };
  }

  const annualGallons = annualMiles / mpg;
  return {
    powertrain: vehicle.powertrain satisfies Powertrain,
    blendedMpg: mpg,
    annualGallons,
    annualKwh: 0,
    annualFuelCostCents: Math.round(annualGallons * pricePerGallon * 100),
    annualCo2Lbs: co2,
    tailpipeOnly: false,
    electricityRateCentsPerKwh,
    phevElectricShare: 0,
    pricePerGallon,
  };
}
