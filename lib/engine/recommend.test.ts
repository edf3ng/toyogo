import { describe, expect, it } from "vitest";
import { analysisFor, PERSONAS } from "@/data/personas";
import { monthlyPaymentCents } from "@/lib/engine/finance";
import { recommend } from "@/lib/engine/recommend";

function brief(personaId: string, priority?: "lowest_payment" | "lowest_emissions" | "newest_car" | "lowest_total") {
  const persona = PERSONAS.find((item) => item.id === personaId);
  if (!persona) throw new Error(personaId);
  const result = recommend(analysisFor(persona, priority ? { priority } : undefined));
  return {
    id: result.headline.id,
    variant: result.headline.variant,
    route: result.headline.next.kind,
    ranked: result.ranked.map((move) => ({
      id: move.id,
      variant: move.variant,
      score: Number(move.score.toFixed(3)),
      monthly: move.monthlyPaymentCents,
      five: move.fiveYearNetCents,
    })),
    ruledOut: result.ruledOut.map((move) => move.id + (move.variant ? `:${move.variant}` : "")),
  };
}

describe("recommendations", () => {
  it("sends the three personas to three different recommendations", () => {
    const signatures = PERSONAS.map((persona) => {
      const result = recommend(analysisFor(persona));
      return `${result.headline.id}:${result.headline.vehicleLabel ?? result.headline.title}`;
    });
    expect(new Set(signatures).size).toBe(3);
    expect(signatures[1]).toContain("DEFER_PAYMENT");
  });

  it("trades Elena up while the payment is what matters", () => {
    const result = recommend(analysisFor(PERSONAS[0]));
    expect(result.headline.id, JSON.stringify(brief("elena"), null, 2)).toBe("TRADE_UP");
    expect(result.headline.next.kind).toBe("ELIGIBLE_OFFER");
    expect(result.equityCents).toBeGreaterThan(0);
  });

  it("switches Elena to the plug-in hybrid when emissions matter", () => {
    const result = recommend(analysisFor(PERSONAS[0], { priority: "lowest_emissions" }));
    expect(result.headline.id, JSON.stringify(brief("elena", "lowest_emissions"), null, 2)).toBe(
      "HYBRID_UPGRADE",
    );
    expect(result.headline.variant).toBe("phev");
    expect(result.headline.breakEvenMonths).not.toBeNull();
  });

  it("offers the income-dip persona a self-service extension", () => {
    const result = recommend(analysisFor(PERSONAS[1]));
    expect(result.headline.id, JSON.stringify(brief("income"), null, 2)).toBe("DEFER_PAYMENT");
    expect(result.headline.next.kind).toBe("SELF_SERVICE");
    expect(result.headline.next.disclosure).toMatch(/interest accrues/i);
  });

  it("upgrades the Highlander with equity applied", () => {
    const result = recommend(analysisFor(PERSONAS[2]));
    expect(result.headline.id, JSON.stringify(brief("equity"), null, 2)).toBe("TRADE_UP");
    expect(result.headline.vehicleLabel).toMatch(/Grand Highlander Hybrid/);
    expect(result.headline.equityAppliedCents).toBeGreaterThan(0);
    expect(result.headline.next.kind).toBe("ELIGIBLE_OFFER");
  });

  it("refinances a high-rate loan when a lower payment is available", () => {
    const persona = PERSONAS[1];
    const input = analysisFor(persona, {
      upcoming: "none",
      priority: "lowest_payment",
      horizon: "3_plus",
      comfortablePaymentCents: 200_000,
      availableCashCents: 0,
    });
    input.contract = {
      kind: "loan",
      principalCents: 2_000_000,
      annualRate: 0.18,
      months: 60,
      monthsElapsed: 12,
    };
    const result = recommend(input);
    expect(result.headline.id, JSON.stringify(result.ranked.map((m) => m.id))).toBe("REFINANCE");
  });

  it("sets a payoff aside when the driver does not have the cash", () => {
    const result = recommend(analysisFor(PERSONAS[2]));
    expect(result.ruledOut.some((move) => move.id === "PAY_OFF_EARLY")).toBe(true);
  });

  it("uses the income persona's actual loan payment as the comfort ceiling", () => {
    const payment = monthlyPaymentCents(4_150_000, 0.029, 60);
    expect(PERSONAS[1].base.driving.comfortablePaymentCents).toBe(payment);
  });
});
