import { describe, expect, it } from "vitest";
import { FALLBACK_FUEL_PRICES } from "@/config/fuel";
import { annualCo2Lbs, annualEnergy, blendedMpg } from "@/lib/engine/fuel";

describe("fuel", () => {
  it("blends city and highway as a harmonic mean", () => {
    const mpg = blendedMpg(32, 41, "mix");
    const expected = 1 / (0.55 / 32 + 0.45 / 41);
    expect(mpg).toBeCloseTo(expected, 6);
  });

  it("converts EPA grams per mile into pounds", () => {
    expect(annualCo2Lbs(12_000, 254)).toBeCloseTo((12_000 * 254) / 453.592, 6);
  });

  it("prices gasoline from gallons and the EPA regular price", () => {
    const energy = annualEnergy({
      vehicle: {
        cityMpg: 32,
        highwayMpg: 41,
        combinedMpg: 35,
        kwhPer100: 0,
        co2TailpipeGpm: 254,
        powertrain: "gas",
        fuelType: "Regular Gasoline",
      },
      annualMiles: 12_000,
      mix: "mix",
      fuelPrices: FALLBACK_FUEL_PRICES,
      electricityRateCentsPerKwh: 16,
    });
    const gallons = 12_000 / blendedMpg(32, 41, "mix");
    expect(energy.annualGallons).toBeCloseTo(gallons, 6);
    expect(energy.annualFuelCostCents).toBe(Math.round(gallons * 4.28 * 100));
    expect(energy.tailpipeOnly).toBe(false);
  });

  it("prices a battery EV from kWh and labels tailpipe CO2 as zero", () => {
    const energy = annualEnergy({
      vehicle: {
        cityMpg: 131,
        highwayMpg: 107,
        combinedMpg: 119,
        kwhPer100: 28.317,
        co2TailpipeGpm: 0,
        powertrain: "bev",
        fuelType: "Electricity",
      },
      annualMiles: 10_000,
      mix: "mix",
      fuelPrices: FALLBACK_FUEL_PRICES,
      electricityRateCentsPerKwh: 16,
    });
    const kwh = (10_000 / 100) * 28.317;
    expect(energy.annualKwh).toBeCloseTo(kwh, 6);
    expect(energy.annualFuelCostCents).toBe(Math.round(kwh * 16));
    expect(energy.annualCo2Lbs).toBe(0);
    expect(energy.tailpipeOnly).toBe(true);
    expect(energy.annualGallons).toBe(0);
  });
});
