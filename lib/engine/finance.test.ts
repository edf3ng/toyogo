import { describe, expect, it } from "vitest";
import { leaseMonthlyCents, monthlyPaymentCents, remainingBalanceCents, totalInterestCents } from "@/lib/engine/finance";

describe("finance", () => {
  it("matches a known 6% amortizing payment", () => {
    // $20,000, 6% APR, 60 months → $386.66.
    expect(monthlyPaymentCents(2_000_000, 0.06, 60)).toBe(38_666);
  });

  it("splits a zero-rate loan evenly", () => {
    expect(monthlyPaymentCents(1_200_000, 0, 12)).toBe(100_000);
  });

  it("returns the remaining balance after a year of payments", () => {
    // Same loan, formula applied for 12 months, then rounded to cents.
    expect(remainingBalanceCents(2_000_000, 0.06, 60, 12)).toBe(1_646_394);
  });

  it("counts interest as payments minus principal", () => {
    expect(totalInterestCents(2_000_000, 0.06, 60)).toBe(319_960);
  });

  it("builds a lease payment from depreciation and rent charge", () => {
    const payment = leaseMonthlyCents({
      kind: "lease",
      capCostCents: 2_350_000,
      residualCents: 1_410_000,
      moneyFactor: 0.0018,
      months: 36,
      monthsElapsed: 33,
      payoffCents: 850_000,
    });
    // (2,350,000 − 1,410,000) / 36 + (2,350,000 + 1,410,000) × 0.0018 = 32,879¢.
    expect(payment).toBe(32_879);
  });
});
