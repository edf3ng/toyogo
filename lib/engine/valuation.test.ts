import { describe, expect, it } from "vitest";
import { mileageAdjustmentCents, retentionFactor, valueVehicle } from "@/lib/engine/valuation";

describe("valuation", () => {
  it("holds the full MSRP at age zero and 80% after year one", () => {
    expect(retentionFactor(0)).toBe(1);
    expect(retentionFactor(1)).toBeCloseTo(0.8, 10);
  });

  it("applies the year 2–5 multiplier after the first year", () => {
    expect(retentionFactor(2)).toBeCloseTo(0.8 * 0.88, 10);
  });

  it("uses the slower multiplier after year five", () => {
    const atFive = 0.8 * 0.88 ** 4;
    expect(retentionFactor(6)).toBeCloseTo(atFive * 0.92, 10);
  });

  it("adds value for miles under the 12,000-a-year pace", () => {
    expect(mileageAdjustmentCents(10_000, 1)).toBe(20_000);
    expect(mileageAdjustmentCents(14_000, 1)).toBe(-20_000);
  });

  it("quotes a range around the base and a lower trade-in", () => {
    const value = valueVehicle(2_000_000, 1, 12_000);
    expect(value.baseValueCents).toBe(1_600_000);
    expect(value.retailLowCents).toBe(Math.round(1_600_000 * 0.94));
    expect(value.retailHighCents).toBe(Math.round(1_600_000 * 1.06));
    expect(value.tradeInCents).toBe(Math.round(1_600_000 * 0.87));
    expect(value.tradeInCents).toBeLessThan(value.retailLowCents);
  });
});
