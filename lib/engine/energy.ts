import { ENERGY } from "@/config/energy";
import { blendedMpg } from "@/lib/engine/fuel";
import type { Cents, DriveMix, Powertrain } from "@/types";

export type ChargeAccess = "yes" | "maybe" | "no" | "unsure";

export interface EnergyVehicle {
  powertrain: Powertrain;
  cityMpg: number;
  highwayMpg: number;
  /** Combined kWh per 100 miles. Zero for a petrol-only hybrid. */
  kwhPer100: number;
  /** Charge-depleting miles for a plug-in hybrid. */
  electricRangeMiles: number;
}

export interface EnergyCost {
  powertrain: Powertrain;
  annualMiles: number;
  electricMiles: number;
  gasMiles: number;
  /** Share of the year's miles that run on a charge. Zero for a standard hybrid. */
  electricShare: number;
  blendedMpg: number;
  annualGallons: number;
  annualKwh: number;
  annualCostCents: Cents;
}

/** A standard hybrid never plugs in. "Maybe" means a home charger is possible. */
export function canCharge(access: ChargeAccess): boolean {
  return access === "yes" || access === "maybe";
}

export function annualMilesFromDaily(
  dailyMiles: number,
  drivingDays: number = ENERGY.drivingDaysPerYear,
): number {
  return Math.max(0, dailyMiles) * drivingDays;
}

/**
 * Petrol, hybrid, plug-in, and battery costs from the same inputs.
 * A plug-in's electric miles are the daily drive capped by its electric range,
 * and only when the driver can charge. A standard hybrid stays on petrol.
 */
export function energyCost(input: {
  vehicle: EnergyVehicle;
  dailyMiles: number;
  mix: DriveMix;
  chargeAccess: ChargeAccess;
  gasDollarsPerGallon: number;
  electricityCentsPerKwh: number;
  drivingDays?: number;
}): EnergyCost {
  const days = input.drivingDays ?? ENERGY.drivingDaysPerYear;
  const annualMiles = annualMilesFromDaily(input.dailyMiles, days);
  const mpg = blendedMpg(input.vehicle.cityMpg, input.vehicle.highwayMpg, input.mix);
  const gasCents = Math.round(input.gasDollarsPerGallon * 100);
  const kwhRate = input.electricityCentsPerKwh;

  if (input.vehicle.powertrain === "bev") {
    const annualKwh = (annualMiles / 100) * input.vehicle.kwhPer100;
    return {
      powertrain: "bev",
      annualMiles,
      electricMiles: annualMiles,
      gasMiles: 0,
      electricShare: annualMiles > 0 ? 1 : 0,
      blendedMpg: 0,
      annualGallons: 0,
      annualKwh,
      annualCostCents: Math.round(annualKwh * kwhRate),
    };
  }

  if (input.vehicle.powertrain === "phev") {
    const dailyElectric = canCharge(input.chargeAccess)
      ? Math.min(Math.max(0, input.dailyMiles), Math.max(0, input.vehicle.electricRangeMiles))
      : 0;
    const electricMiles = dailyElectric * days;
    const gasMiles = Math.max(0, annualMiles - electricMiles);
    const annualGallons = mpg > 0 ? gasMiles / mpg : 0;
    const annualKwh = (electricMiles / 100) * input.vehicle.kwhPer100;
    return {
      powertrain: "phev",
      annualMiles,
      electricMiles,
      gasMiles,
      electricShare: annualMiles > 0 ? electricMiles / annualMiles : 0,
      blendedMpg: mpg,
      annualGallons,
      annualKwh,
      annualCostCents: Math.round(annualGallons * gasCents + annualKwh * kwhRate),
    };
  }

  const annualGallons = mpg > 0 ? annualMiles / mpg : 0;
  return {
    powertrain: input.vehicle.powertrain,
    annualMiles,
    electricMiles: 0,
    gasMiles: annualMiles,
    electricShare: 0,
    blendedMpg: mpg,
    annualGallons,
    annualKwh: 0,
    annualCostCents: Math.round(annualGallons * gasCents),
  };
}

/**
 * Months of fuel savings needed to cover a higher payment.
 * Zero when the new payment is not higher. Infinity when fuel does not fall.
 */
export function paybackMonths(paymentDeltaCents: Cents, monthlyEnergySavingCents: Cents): number {
  if (paymentDeltaCents <= 0) return 0;
  if (monthlyEnergySavingCents <= 0) return Number.POSITIVE_INFINITY;
  return paymentDeltaCents / monthlyEnergySavingCents;
}

export interface SwitchWorth {
  annualFuelSaveCents: Cents;
  extraMonthlyCents: Cents;
  extraYearCents: Cents;
  /** Fuel savings divided by the extra payment. Null when the payment does not rise. */
  fuelCoversShare: number | null;
  netMonthlyCents: Cents;
  fiveYearFuelCents: Cents;
  fiveYearExtraCents: Cents;
  fiveYearNetCents: Cents;
  paybackMonths: number;
}

/** How much of the extra new-car payment is covered by cheaper fuel. */
export function switchWorth(input: {
  paymentDeltaCents: Cents;
  monthlyEnergySavingCents: Cents;
}): SwitchWorth {
  const extraMonthlyCents = input.paymentDeltaCents;
  const annualFuelSaveCents = input.monthlyEnergySavingCents * 12;
  const extraYearCents = extraMonthlyCents * 12;
  const fuelCoversShare = extraMonthlyCents > 0 ? input.monthlyEnergySavingCents / extraMonthlyCents : null;
  return {
    annualFuelSaveCents,
    extraMonthlyCents,
    extraYearCents,
    fuelCoversShare,
    netMonthlyCents: extraMonthlyCents - input.monthlyEnergySavingCents,
    fiveYearFuelCents: annualFuelSaveCents * 5,
    fiveYearExtraCents: extraMonthlyCents * 60,
    fiveYearNetCents: extraMonthlyCents * 60 - annualFuelSaveCents * 5,
    paybackMonths: paybackMonths(extraMonthlyCents, input.monthlyEnergySavingCents),
  };
}
