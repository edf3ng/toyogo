import { generateJson } from "@/lib/gemini";
import type { MarketValue } from "@/types/market";

const SERP = "https://serpapi.com/search.json";
const CURRENT_YEAR = new Date().getUTCFullYear();

export interface MarketQuery {
  year: number;
  model: string;
  miles: number;
  issues: readonly string[];
}

interface Snippet {
  title: string;
  snippet: string;
  source: string;
  link: string;
}

async function serpSearch(query: string, key: string): Promise<Snippet[]> {
  const url = `${SERP}?${new URLSearchParams({ engine: "google", q: query, num: "6", gl: "us", api_key: key })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`serpapi ${response.status}`);
  const payload = (await response.json()) as {
    organic_results?: { title?: string; snippet?: string; source?: string; displayed_link?: string; link?: string }[];
  };
  return (payload.organic_results ?? []).slice(0, 6).map((row) => ({
    title: (row.title ?? "").slice(0, 120),
    snippet: (row.snippet ?? "").slice(0, 300),
    source: row.source ?? row.displayed_link ?? "",
    link: row.link ?? "",
  }));
}

/** Model years for the depreciation graph: older and newer than the driver's car, never in the future. */
export function curveYears(year: number): number[] {
  return [year - 4, year - 2, year, year + 2].filter((y) => y <= CURRENT_YEAR + 1 && y >= 2000);
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    tradeIn: {
      type: "OBJECT",
      properties: { lowDollars: { type: "NUMBER" }, midDollars: { type: "NUMBER" }, highDollars: { type: "NUMBER" } },
      required: ["lowDollars", "midDollars", "highDollars"],
    },
    retail: {
      type: "OBJECT",
      properties: { lowDollars: { type: "NUMBER" }, midDollars: { type: "NUMBER" }, highDollars: { type: "NUMBER" } },
      required: ["lowDollars", "midDollars", "highDollars"],
    },
    comparables: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          priceDollars: { type: "NUMBER" },
          miles: { type: "NUMBER", nullable: true },
          source: { type: "STRING" },
          link: { type: "STRING" },
        },
        required: ["title", "priceDollars", "source", "link"],
      },
    },
    curve: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { modelYear: { type: "NUMBER" }, midDollars: { type: "NUMBER" } },
        required: ["modelYear", "midDollars"],
      },
    },
    notes: { type: "STRING" },
  },
  required: ["tradeIn", "retail", "comparables", "curve", "notes"],
};

export async function marketValue(q: MarketQuery, serpKey: string, geminiKey: string, model: string): Promise<MarketValue> {
  const car = /toyota/i.test(q.model) ? q.model : `Toyota ${q.model}`;
  const years = curveYears(q.year);
  const queries = [
    { label: "price at this mileage", q: `${q.year} ${car} ${q.miles} miles used price` },
    { label: "trade-in value", q: `KBB trade-in value ${q.year} ${car}` },
    { label: "comparable listings", q: `${q.year} ${car} used for sale cargurus` },
    ...years
      .filter((y) => y !== q.year)
      .map((y) => ({ label: `curve ${y}`, q: `${y} ${car} used price average` })),
  ];
  // One failed search should cost its own year, not the whole valuation.
  const settled = await Promise.all(
    queries.map(async (item) => {
      try {
        return { ...item, rows: await serpSearch(item.q, serpKey) };
      } catch {
        return null;
      }
    }),
  );
  const results = settled.filter((row): row is NonNullable<typeof row> => row !== null && row.rows.length > 0);
  if (results.length === 0) throw new Error("no search results");

  const prompt = [
    "You value a used car from Google search results only. Use KBB, Edmunds, CarGurus and listing snippets.",
    "Never invent prices. If the results do not support a figure, estimate conservatively and say so in notes.",
    `Car: ${q.year} ${car}, ${q.miles} miles. Condition notes: ${q.issues.length ? q.issues.join(", ") : "none"}.`,
    "Adjust the range for the actual mileage (about 12,000 miles a year is typical) and for the condition notes.",
    "tradeIn is what a dealer would pay. retail is what a dealer would ask. Dollars, whole numbers, low <= mid <= high.",
    "comparables: up to 5 real listings quoted in the snippets, with the price and miles stated there. Use the result's link.",
    `curve: one midDollars retail value per model year for ${years.join(", ")}, at typical mileage for that age.`,
    "notes: two short sentences on what the range rests on.",
    "",
    JSON.stringify(results),
  ].join("\n");

  const text = await generateJson(prompt, geminiKey, model, SCHEMA);
  const value = JSON.parse(text) as MarketValue;
  const ok = (r: { lowDollars: number; midDollars: number; highDollars: number }) =>
    [r.lowDollars, r.midDollars, r.highDollars].every((n) => Number.isFinite(n) && n > 0) &&
    r.lowDollars <= r.midDollars &&
    r.midDollars <= r.highDollars;
  if (!ok(value.tradeIn) || !ok(value.retail)) throw new Error("bad range");
  value.curve = value.curve
    .filter((p) => Number.isFinite(p.midDollars) && p.midDollars > 0)
    .sort((a, b) => a.modelYear - b.modelYear);
  return value;
}
