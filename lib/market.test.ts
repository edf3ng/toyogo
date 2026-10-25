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
          q: "2019 Toyota Camry used",
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
        {
          label: "curve 2017",
          q: "2017 Toyota Camry used price average",
          rows: [
            {
              title: "2017 Toyota Camry values",
              snippet: "Typical asking $15,475.",
              source: "KBB",
              link: "https://www.kbb.com/toyota/camry/2017/",
            },
          ],
        },
      ],
    );
    expect(value).not.toBeNull();
    expect(value?.retail.lowDollars).toBeLessThanOrEqual(value?.retail.midDollars ?? 0);
    expect(value?.retail.midDollars).toBeLessThanOrEqual(value?.retail.highDollars ?? 0);
    expect(value?.comparables[0]?.priceDollars).toBe(18700);
    expect(value?.curve.map((point) => point.modelYear)).toEqual([2017, 2019]);
    expect(value?.curve[0]?.midDollars).toBe(15475);
  });

  it("returns null when snippets have no usable prices", () => {
    expect(
      marketFromSnippets({ year: 2019, model: "Camry", miles: 40_000, issues: [] }, [2019], [
        { label: "empty", q: "q", rows: [{ title: "Forum", snippet: "Nice car", source: "x", link: "https://x.test" }] },
      ]),
    ).toBeNull();
  });
});
