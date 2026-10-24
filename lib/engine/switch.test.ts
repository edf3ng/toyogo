import { describe, expect, it } from "vitest";
import { DRIVERS } from "@/data/drivers";
import { priceDeal } from "@/lib/engine/deal";
import { energyCost, paybackMonths } from "@/lib/engine/energy";
import { recommendSwitch } from "@/lib/engine/switch";

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

describe("the three drivers", () => {
  it("sends Alex to a viable battery EV", () => {
    const result = recommendSwitch(DRIVERS[0].input);
    expect(result.winner.powertrain).toBe("bev");
    expect(result.winner.verdict).toBe("viable");
    expect(result.winner.label).toMatch(/bZ4X/);
  });

  it("sends Blair to a plug-in with a caveat, covering about 76% of the day", () => {
    const result = recommendSwitch(DRIVERS[1].input);
    expect(result.winner.powertrain).toBe("phev");
    expect(result.winner.verdict).toBe("caveats");
    expect(result.winner.electricShare).toBeCloseTo(42 / 55, 2);
    expect(result.winner.limiting).toBe("daily");
  });

  it("sends Casey to a standard hybrid because charging fails", () => {
    const result = recommendSwitch(DRIVERS[2].input);
    expect(result.winner.powertrain).toBe("hybrid");
    expect(result.winner.verdict).toBe("viable");
    const plugs = result.ranked.filter((car) => car.powertrain === "phev" || car.powertrain === "bev");
    expect(plugs.length).toBeGreaterThan(0);
    expect(plugs.every((car) => car.verdict === "not_yet")).toBe(true);
    expect(plugs.every((car) => car.gates.charging === 0)).toBe(true);
  });
});
