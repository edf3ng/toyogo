import { describe, expect, it } from "vitest";
import { priceDeal } from "@/lib/engine/deal";
import { energyCost, paybackMonths, switchWorth } from "@/lib/engine/energy";
import { recommendSwitch, type SwitchInput } from "@/lib/engine/switch";
import { PRIORITY_KEYS } from "@/config/priorities";
import { viabilityMultiplier } from "@/lib/engine/viability";

describe("energy", () => {
  it("keeps a standard hybrid on petrol", () => {
    const cost = energyCost({
      vehicle: {
        powertrain: "hybrid",
        cityMpg: 53,
        highwayMpg: 46,
        kwhPer100: 0,
        electricRangeMiles: 0,
      },
      dailyMiles: 30,
      mix: "mix",
      chargeAccess: "yes",
      gasDollarsPerGallon: 4.28,
      electricityCentsPerKwh: 14.5,
    });
    expect(cost.electricMiles).toBe(0);
    expect(cost.annualKwh).toBe(0);
    expect(cost.electricShare).toBe(0);
  });

  it("caps a plug-in at its electric range", () => {
    const cost = energyCost({
      vehicle: {
        powertrain: "phev",
        cityMpg: 40,
        highwayMpg: 36,
        kwhPer100: 36,
        electricRangeMiles: 42,
      },
      dailyMiles: 55,
      mix: "mix",
      chargeAccess: "yes",
      gasDollarsPerGallon: 4.28,
      electricityCentsPerKwh: 14.5,
    });
    expect(cost.electricShare).toBeCloseTo(42 / 55, 5);
  });

  it("gives a plug-in no electric miles when the driver cannot charge", () => {
    const cost = energyCost({
      vehicle: {
        powertrain: "phev",
        cityMpg: 40,
        highwayMpg: 36,
        kwhPer100: 36,
        electricRangeMiles: 42,
      },
      dailyMiles: 55,
      mix: "mix",
      chargeAccess: "no",
      gasDollarsPerGallon: 4.28,
      electricityCentsPerKwh: 14.5,
    });
    expect(cost.electricMiles).toBe(0);
    expect(cost.gasMiles).toBe(55 * 250);
  });
});

describe("payback", () => {
  it("is zero when the payment does not rise and infinite when fuel does not fall", () => {
    expect(paybackMonths(-100, 500)).toBe(0);
    expect(paybackMonths(0, 500)).toBe(0);
    expect(paybackMonths(400, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("switchWorth", () => {
  it("says how much of the extra payment cheaper fuel covers", () => {
    const worth = switchWorth({ paymentDeltaCents: 30_100, monthlyEnergySavingCents: 3_208 });
    expect(worth.annualFuelSaveCents).toBe(38_496);
    expect(worth.extraYearCents).toBe(361_200);
    expect(worth.fuelCoversShare).toBeCloseTo(3208 / 30100, 5);
    expect(worth.netMonthlyCents).toBe(26_892);
    expect(worth.fiveYearFuelCents).toBe(192_480);
    expect(worth.fiveYearExtraCents).toBe(1_806_000);
    expect(worth.paybackMonths).toBeCloseTo(30100 / 3208, 5);
  });

  it("leaves the cover share empty when the payment does not rise", () => {
    const worth = switchWorth({ paymentDeltaCents: 0, monthlyEnergySavingCents: 5_000 });
    expect(worth.fuelCoversShare).toBeNull();
    expect(worth.netMonthlyCents).toBe(-5_000);
    expect(worth.paybackMonths).toBe(0);
  });
});

describe("deal", () => {
  it("taxes the price after the trade-in and keeps negative equity visible", () => {
    const deal = priceDeal({
      priceCents: 3_000_000,
      tradeInCents: 800_000,
      payoffCents: 1_200_000,
      cashDownCents: 0,
      currentPaymentCents: 0,
      taxRate: 0.0625,
      feesCents: 0,
    });
    expect(deal.taxCents).toBe(Math.round(2_200_000 * 0.0625));
    expect(deal.negativeEquity).toBe(true);
    expect(deal.equityCents).toBe(-400_000);
    expect(deal.amountFinancedCents).toBe(3_000_000 + deal.taxCents - 800_000 + 1_200_000);
  });
});

const AS_OF = "2026-10-24";

function scene(partial: Omit<SwitchInput, "asOf" | "mix" | "cashDownCents" | "gasDollarsPerGallon" | "electricityCentsPerKwh"> & { mix?: SwitchInput["mix"] }): SwitchInput {
  return {
    asOf: AS_OF,
    mix: partial.mix ?? "mix",
    cashDownCents: 0,
    gasDollarsPerGallon: 4.28,
    electricityCentsPerKwh: 14.5,
    ...partial,
  };
}

describe("three different drives", () => {
  it("sends a short commute with home charging to a viable battery EV", () => {
    const result = recommendSwitch(
      scene({
        current: {
          id: "40241",
          year: 2019,
          model: "Corolla",
          cityMpg: 28,
          highwayMpg: 36,
          co2TailpipeGpm: 281,
          msrpCents: 2_350_000,
          miles: 68_000,
        },
        contract: { kind: "owned" },
        dailyMiles: 22,
        chargeAccess: "yes",
        stationCount: 12,
        budgetCents: 90_000,
        priorities: ["co2", "fuel", "payment", "total", "practical", "performance"],
      }),
    );
    expect(result.winner.powertrain).toBe("bev");
    expect(result.winner.verdict).toBe("viable");
    expect(result.winner.label).toMatch(/bZ4X/);
    const weighted = PRIORITY_KEYS.reduce((sum, key) => sum + result.winner.factors[key], 0);
    expect(result.winner.score).toBeCloseTo(weighted * viabilityMultiplier(result.winner.verdict), 8);
  });

  it("sends a day longer than the plug-in range to a plug-in with a caveat", () => {
    const result = recommendSwitch(
      scene({
        current: {
          id: "42959",
          year: 2021,
          model: "RAV4",
          cityMpg: 27,
          highwayMpg: 35,
          co2TailpipeGpm: 296,
          msrpCents: 3_280_000,
          miles: 44_000,
          cargoCuFt: 37,
          horsepower: 203,
        },
        contract: {
          kind: "loan",
          principalCents: 3_280_000,
          annualRate: 0.049,
          months: 60,
          monthsElapsed: 38,
        },
        dailyMiles: 55,
        chargeAccess: "yes",
        stationCount: 12,
        budgetCents: 90_000,
        priorities: ["fuel", "co2", "performance", "practical", "payment", "total"],
      }),
    );
    expect(result.winner.powertrain).toBe("phev");
    expect(result.winner.verdict).toBe("caveats");
    expect(result.winner.electricShare).toBeCloseTo(42 / 55, 2);
    expect(result.winner.limiting).toBe("daily");
  });

  it("sends a drive with no charging to a standard hybrid", () => {
    const result = recommendSwitch(
      scene({
        current: {
          id: "38880",
          year: 2018,
          model: "Camry",
          cityMpg: 29,
          highwayMpg: 41,
          co2TailpipeGpm: 264,
          msrpCents: 3_050_000,
          miles: 91_000,
        },
        contract: { kind: "owned" },
        dailyMiles: 30,
        chargeAccess: "no",
        stationCount: 0,
        budgetCents: 70_000,
        priorities: ["payment", "fuel", "total", "co2", "practical", "performance"],
      }),
    );
    expect(result.winner.powertrain).toBe("hybrid");
    expect(result.winner.verdict).toBe("viable");
    const plugs = result.ranked.filter((car) => car.powertrain === "phev" || car.powertrain === "bev");
    expect(plugs.length).toBeGreaterThan(0);
    expect(plugs.every((car) => car.verdict === "not_yet")).toBe(true);
    expect(plugs.every((car) => car.gates.charging === 0)).toBe(true);
  });
});
