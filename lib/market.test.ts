import { describe, expect, it } from "vitest";
import { curveYears, dollarsFromText, marketFromSnippets } from "@/lib/market";

describe("dollarsFromText", () => {
  it("reads listing prices and skips junk", () => {
    expect(dollarsFromText("KBB typical listing $18,701 · trade-in $13,600")).toEqual([18701, 13600]);
    expect(dollarsFromText("Save $20 today")).toEqual([]);
  });
});

describe("marketFromSnippets", () => {
  it("builds ranges only from quoted amounts", () => {
    const value = marketFromSnippets(
      { year: 2019, model: "Camry", miles: 40_000, issues: [] },
      curveYears(2019),
      [
        {
          label: "listings",
          q: "used",
          rows: [
            {
              title: "2019 Toyota Camry",
              snippet: "Listed at $18,700 with 41,200 mi. Nearby asking $22,223.",
              source: "Cars.com",
              link: "https://www.cars.com/shopping/toyota-camry-2019/",
            },
            {
              title: "KBB fair purchase",
              snippet: "Typical range $15,950 to $19,400.",
              source: "KBB",
              link: "https://www.kbb.com/",
            },
          ],
        },
      ],
    );
    expect(value).not.toBeNull();
    expect(value?.retail.lowDollars).toBeLessThanOrEqual(value?.retail.midDollars ?? 0);
    expect(value?.retail.midDollars).toBeLessThanOrEqual(value?.retail.highDollars ?? 0);
    expect(value?.comparables[0]?.priceDollars).toBe(18700);
    expect(value?.curve.some((point) => point.modelYear === 2019)).toBe(true);
  });

  it("returns null when snippets have no usable prices", () => {
    expect(
      marketFromSnippets({ year: 2019, model: "Camry", miles: 40_000, issues: [] }, [2019], [
        { label: "empty", q: "q", rows: [{ title: "Forum", snippet: "Nice car", source: "x", link: "https://x.test" }] },
      ]),
    ).toBeNull();
  });
});
