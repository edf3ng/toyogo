import { VALUATION } from "@/config/valuation";
import type { Cents, ValuationResult } from "@/types";

/**
 * Fractional ages use the same multipliers as whole years, applied with an
 * exponent so month 18 sits between the year-1 and year-2 factors.
 * SPEC: the written curve is yearly; the exponent is the continuous reading.
 */
export function retentionFactor(ageYears: number): number {
  if (ageYears <= 0) return 1;
  const first = Math.min(ageYears, 1);
  const middle = Math.min(Math.max(ageYears - 1, 0), 4);
  const later = Math.max(ageYears - 5, 0);
  return (
    Math.pow(VALUATION.yearOneRetention, first) *
    Math.pow(VALUATION.yearsTwoToFive, middle) *
    Math.pow(VALUATION.beyondFive, later)
  );
}

export function mileageAdjustmentCents(actualMiles: number, ageYears: number): Cents {
  const expected = VALUATION.expectedMilesPerYear * Math.max(ageYears, 0);
  const deviation = expected - actualMiles;
  return Math.round(deviation * VALUATION.mileageRateCents);
}

export function valueVehicle(
  msrpCents: Cents,
  ageYears: number,
  actualMiles: number,
): ValuationResult {
  const retention = retentionFactor(ageYears);
  const mileageAdjustment = mileageAdjustmentCents(actualMiles, ageYears);
  const baseValueCents = Math.max(0, Math.round(msrpCents * retention) + mileageAdjustment);
  return {
    ageYears,
    retention,
    mileageAdjustmentCents: mileageAdjustment,
    baseValueCents,
    retailLowCents: Math.round(baseValueCents * VALUATION.retailLowFactor),
    retailHighCents: Math.round(baseValueCents * VALUATION.retailHighFactor),
    tradeInCents: Math.round(baseValueCents * (1 - VALUATION.tradeInDiscount)),
    modelled: true,
  };
}

/**
 * Ownership age. A contract's elapsed months are the age when we have them.
 * Otherwise the model year is treated as starting the July before that year.
 */
export function ownershipAgeYears(
  modelYear: number,
  asOf: string,
  monthsElapsed: number | null,
): number {
  if (monthsElapsed !== null && monthsElapsed > 0) return monthsElapsed / 12;
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  const start = Date.UTC(modelYear - 1, 6, 1);
  const years = (asOfMs - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0.25, years);
}
