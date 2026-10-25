import { afterEach, describe, expect, it, vi } from "vitest";
import { buyableToday, ELECTRIFIED_CATALOG } from "@/config/electrified-catalog";
import { buildPrompt, engineAdvice, figuresFor, parseAdvice, rankedOptions, recommendVehicle } from "@/lib/advice";
import { recommendSwitch, type SwitchInput } from "@/lib/engine/switch";

const INPUT: SwitchInput = {
  asOf: "2026-10-24",
  current: {
    id: "40606",
    year: 2019,
    model: "Camry",
    cityMpg: 22,
    highwayMpg: 33,
    co2TailpipeGpm: 338,
    msrpCents: 2_500_000,
    miles: 62_000,
  },
  contract: { kind: "owned" },
  dailyMiles: 30,
  mix: "mix",
  chargeAccess: "yes",
  stationCount: 8,
  budgetCents: 50_000,
  cashDownCents: 0,
  priorities: ["payment"],
  gasDollarsPerGallon: 3.1,
  electricityCentsPerKwh: 14,
};

const options = rankedOptions(recommendSwitch(INPUT));
const catalog = buyableToday(2026);

function reply(picks: unknown[]) {
  return JSON.stringify({ picks });
}

const GOOD = [
  { title: "Best fit", model: "RAV4 Hybrid", year: 2025, why: ["You drive 30 miles a day."], tradeoff: "Costs more." },
  { title: "Most budget friendly", model: "Prius c", year: 2018, why: ["Cheapest to buy used."], tradeoff: "Small." },
  { title: "Lowest emissions", model: "bZ4X", year: 2025, why: ["No tailpipe."], tradeoff: "Needs charging." },
];

describe("parseAdvice", () => {
  it("accepts three catalogue picks and keeps their order", () => {
    const advice = parseAdvice(reply(GOOD), options, catalog);
    expect(advice?.source).toBe("gemini");
    expect(advice?.picks.map((pick) => pick.model)).toEqual(["RAV4 Hybrid", "Prius c", "bZ4X"]);
    expect(advice?.picks.map((pick) => pick.title)).toEqual(["Best fit", "Most budget friendly", "Lowest emissions"]);
  });

  it("carries the catalogue's powertrain and body onto each pick", () => {
    const advice = parseAdvice(reply(GOOD), options, catalog);
    expect(advice?.picks[1]).toMatchObject({ powertrain: "hybrid", body: "5-door hatchback" });
    expect(advice?.picks[2]?.powertrain).toBe("bev");
  });

  it("drops a model that is not in the catalogue", () => {
    const advice = parseAdvice(
      reply([{ title: "Best", model: "Supra EV", year: 2027, why: ["a"], tradeoff: "b" }, ...GOOD]),
      options,
      catalog,
    );
    expect(advice?.picks.map((pick) => pick.model)).toEqual(["RAV4 Hybrid", "Prius c", "bZ4X"]);
  });

  it("drops a year outside the model's own span", () => {
    // The catalogue stops the Prius c at 2019.
    const advice = parseAdvice(
      reply([{ title: "Best", model: "Prius c", year: 2024, why: ["a"], tradeoff: "b" }]),
      options,
      catalog,
    );
    expect(advice).toBeNull();
  });

  it("never returns more than three, or the same model twice", () => {
    const many = [...GOOD, { title: "Fourth", model: "Sienna", year: 2025, why: ["a"], tradeoff: "b" }];
    expect(parseAdvice(reply(many), options, catalog)?.picks).toHaveLength(3);
    const dupes = [GOOD[0], { ...GOOD[0], title: "Again", year: 2024 }, GOOD[1]];
    const advice = parseAdvice(reply(dupes), options, catalog);
    expect(advice?.picks.map((pick) => pick.model)).toEqual(["RAV4 Hybrid", "Prius c"]);
  });

  it("rejects malformed or incomplete answers", () => {
    expect(parseAdvice("not json", options, catalog)).toBeNull();
    expect(parseAdvice(JSON.stringify({}), options, catalog)).toBeNull();
    expect(parseAdvice(reply([{ ...GOOD[0], title: "" }]), options, catalog)).toBeNull();
    expect(parseAdvice(reply([{ ...GOOD[0], why: [] }]), options, catalog)).toBeNull();
    expect(parseAdvice(reply([{ ...GOOD[0], tradeoff: "" }]), options, catalog)).toBeNull();
  });
});

describe("figuresFor", () => {
  it("attaches the scorer's numbers when the pick is one it prices", () => {
    const priced = options[0];
    const figures = figuresFor(priced.model, priced.year, options);
    expect(figures?.paymentCents).toBe(priced.paymentCents);
  });

  it("leaves figures off a vehicle the scorer never priced", () => {
    expect(figuresFor("Prius c", 2018, options)).toBeUndefined();
    const advice = parseAdvice(reply(GOOD), options, catalog);
    expect(advice?.picks.find((pick) => pick.model === "Prius c")?.figures).toBeUndefined();
  });
});

describe("recommendVehicle", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubGemini(body: unknown, status = 200) {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(
        JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] } : body),
        { status, headers: { "Content-Type": "application/json" } },
      ),
    ));
  }

  it("returns Gemini's three picks", async () => {
    stubGemini({ picks: GOOD });
    const advice = await recommendVehicle(INPUT, recommendSwitch(INPUT), "key", "gemini-3.8-flash");
    expect(advice?.source).toBe("gemini");
    expect(advice?.picks).toHaveLength(3);
  });

  it("falls back to the scorer when every pick is invented", async () => {
    stubGemini({ picks: [{ title: "Best", model: "Prius Max", year: 2030, why: ["a"], tradeoff: "b" }] });
    const advice = await recommendVehicle(INPUT, recommendSwitch(INPUT), "key", "gemini-3.8-flash");
    expect(advice?.source).toBe("engine");
    expect(advice?.picks[0].title).toBe("Best fit");
  });

  it("falls back to the scorer when the quota is exhausted", async () => {
    stubGemini({ error: { details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "9471s" }] } }, 429);
    const advice = await recommendVehicle(INPUT, recommendSwitch(INPUT), "key", "gemini-3.8-flash");
    expect(advice?.source).toBe("engine");
  });
});

describe("engineAdvice", () => {
  it("titles the scorer's ranking and keeps its figures", () => {
    const advice = engineAdvice(options, catalog);
    expect(advice?.source).toBe("engine");
    expect(advice?.picks.length).toBeGreaterThan(0);
    expect(advice?.picks.length).toBeLessThanOrEqual(3);
    expect(advice?.picks[0].figures?.paymentCents).toBe(options[0].paymentCents);
  });
});

describe("buildPrompt", () => {
  it("lists the catalogue and forbids numbers for unpriced vehicles", () => {
    const prompt = buildPrompt(INPUT, options, catalog);
    expect(prompt).toContain("Corolla Hybrid (2020-2026");
    expect(prompt).toContain("ONLY if it appears above");
    expect(prompt).toContain("30 miles a day");
  });

  it("offers only vehicles a driver could buy today", () => {
    expect(catalog.some((row) => row.model === "RAV4 EV")).toBe(false);
    expect(ELECTRIFIED_CATALOG.some((row) => row.model === "RAV4 EV")).toBe(true);
  });
});
