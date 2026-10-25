import { generateJson } from "@/lib/gemini";
import type { MarketComparable, MarketValue } from "@/types/market";

const SERP = "https://serpapi.com/search.json";
const CURRENT_YEAR = new Date().getUTCFullYear();
/** Spec: each external call has a 3s timeout. Six long searches cannot finish on Vercel. */
const SERP_TIMEOUT_MS = 3_000;
const GEMINI_DEADLINE_MS = process.env.VERCEL ? 6_000 : 40_000;
const GEMINI_ATTEMPT_MS = process.env.VERCEL ? 5_500 : 20_000;

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

interface SearchRow {
  label: string;
  q: string;
  rows: Snippet[];
}

async function serpSearch(query: string, key: string): Promise<Snippet[]> {
  const url = `${SERP}?${new URLSearchParams({ engine: "google", q: query, num: "6", gl: "us", api_key: key })}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(SERP_TIMEOUT_MS),
    cache: "no-store",
    headers: { "x-source": "live" },
  });
  if (!response.ok) throw new Error(`serpapi ${response.status}`);
  const payload = (await response.json()) as {
    error?: string;
    organic_results?: { title?: string; snippet?: string; source?: string; displayed_link?: string; link?: string }[];
  };
  if (payload.error) throw new Error(`serpapi ${payload.error}`);
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

/** Dollar amounts quoted in a listing snippet. Used when Gemini does not finish in time. */
export function dollarsFromText(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})/g)) {
    const value = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(value) && value >= 3_000 && value <= 80_000) amounts.push(value);
  }
  return amounts;
}

function pick(amounts: number[], share: number): number {
  if (amounts.length === 0) return 0;
  const index = Math.min(amounts.length - 1, Math.max(0, Math.floor(amounts.length * share)));
  return amounts[index];
}

function yearForRow(item: SearchRow, fallback: number): number {
  const fromLabel = item.label.match(/curve (\d{4})/);
  if (fromLabel) return Number(fromLabel[1]);
  const fromQuery = item.q.match(/\b(20\d{2})\b/);
  return fromQuery ? Number(fromQuery[1]) : fallback;
}

/** Mid asking price per model year, only where a snippet quoted a dollar amount. */
export function curveFromSnippets(q: MarketQuery, years: number[], results: SearchRow[]): MarketValue["curve"] {
  const byYear = new Map<number, number[]>();
  for (const item of results) {
    const modelYear = yearForRow(item, q.year);
    if (!years.includes(modelYear)) continue;
    const list = byYear.get(modelYear) ?? [];
    for (const row of item.rows) list.push(...dollarsFromText(`${row.title} ${row.snippet}`));
    byYear.set(modelYear, list);
  }
  return years.flatMap((modelYear) => {
    const list = (byYear.get(modelYear) ?? []).sort((a, b) => a - b);
    return list.length > 0 ? [{ modelYear, midDollars: pick(list, 0.5) }] : [];
  });
}

/** Conservative ranges from the search snippets only. Never invents a figure. */
export function marketFromSnippets(q: MarketQuery, years: number[], results: SearchRow[]): MarketValue | null {
  const amounts = results
    .flatMap((item) => item.rows.flatMap((row) => dollarsFromText(`${row.title} ${row.snippet}`)))
    .sort((a, b) => a - b);
  if (amounts.length < 3) return null;

  const retailMid = pick(amounts, 0.5);
  const retailLow = Math.min(pick(amounts, 0.2), retailMid);
  const retailHigh = Math.max(pick(amounts, 0.8), retailMid);
  const tradeMid = pick(amounts, 0.3);
  const tradeLow = Math.min(pick(amounts, 0.1), tradeMid);
  const tradeHigh = Math.max(Math.min(pick(amounts, 0.45), retailMid), tradeMid);
  if (!(retailLow > 0 && retailLow <= retailMid && retailMid <= retailHigh)) return null;
  if (!(tradeLow > 0 && tradeLow <= tradeMid && tradeMid <= tradeHigh)) return null;

  const tradeIn = {
    lowDollars: tradeLow,
    midDollars: tradeMid,
    highDollars: tradeHigh,
  };

  const comparables: MarketComparable[] = [];
  for (const item of results) {
    for (const row of item.rows) {
      const price = dollarsFromText(`${row.title} ${row.snippet}`)[0];
      if (!price) continue;
      const milesMatch = `${row.title} ${row.snippet}`.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*mi/i);
      comparables.push({
        title: row.title || `${q.year} Toyota`,
        priceDollars: price,
        miles: milesMatch ? Number(milesMatch[1].replaceAll(",", "")) : null,
        source: row.source || "listing",
        link: row.link,
      });
      if (comparables.length === 5) break;
    }
    if (comparables.length === 5) break;
  }

  const curve = curveFromSnippets(q, years, results);
  if (curve.length === 0) curve.push({ modelYear: q.year, midDollars: retailMid });

  return {
    tradeIn,
    retail: { lowDollars: retailLow, midDollars: retailMid, highDollars: retailHigh },
    comparables,
    curve,
    notes:
      "Read from KBB, Edmunds and CarGurus search snippets. Gemini was unavailable, so these figures stay on the quoted amounts.",
  };
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

function validRange(r: { lowDollars: number; midDollars: number; highDollars: number }): boolean {
  return (
    [r.lowDollars, r.midDollars, r.highDollars].every((n) => Number.isFinite(n) && n > 0) &&
    r.lowDollars <= r.midDollars &&
    r.midDollars <= r.highDollars
  );
}

function uniqueComparables(rows: MarketValue["comparables"]): MarketValue["comparables"] {
  const seen = new Set<string>();
  const unique: MarketValue["comparables"] = [];
  for (const row of rows) {
    const id = row.link || `${row.title}|${row.priceDollars}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(row);
  }
  return unique.slice(0, 5);
}

function finalize(value: MarketValue): MarketValue {
  if (!validRange(value.tradeIn) || !validRange(value.retail)) throw new Error("bad range");
  value.comparables = uniqueComparables(value.comparables);
  value.curve = value.curve
    .filter((point) => Number.isFinite(point.midDollars) && point.midDollars > 0)
    .sort((a, b) => a.modelYear - b.modelYear);
  return value;
}

export async function marketValue(q: MarketQuery, serpKey: string, geminiKey: string, model: string): Promise<MarketValue> {
  const car = /toyota/i.test(q.model) ? q.model : `Toyota ${q.model}`;
  const years = curveYears(q.year);
  // These run together. Extra years feed the Analytics graph and do not add wait time.
  const queries = [
    { label: "price at this mileage", q: `${q.year} ${car} ${q.miles} miles used price` },
    { label: "trade-in value", q: `KBB trade-in value ${q.year} ${car}` },
    { label: "comparable listings", q: `${q.year} ${car} used for sale cargurus` },
    ...years
      .filter((year) => year !== q.year)
      .map((year) => ({ label: `curve ${year}`, q: `${year} ${car} used price average` })),
  ];
  const failures: string[] = [];
  const settled = await Promise.all(
    queries.map(async (item) => {
      try {
        return { ...item, rows: await serpSearch(item.q, serpKey) };
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "search failed");
        return null;
      }
    }),
  );
  const results = settled.filter((row): row is SearchRow => row !== null && row.rows.length > 0);
  if (results.length === 0) throw new Error(failures[0] ?? "no search results");

  if (geminiKey) {
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
    try {
      const text = await generateJson(prompt, geminiKey, model, SCHEMA, {
        deadlineMs: GEMINI_DEADLINE_MS,
        attemptTimeoutMs: GEMINI_ATTEMPT_MS,
      });
      const value = finalize(JSON.parse(text) as MarketValue);
      if (value.curve.length < 2) {
        const fromSearch = curveFromSnippets(q, years, results);
        if (fromSearch.length > value.curve.length) value.curve = fromSearch;
      }
      return finalize(value);
    } catch {
      // Search already succeeded. Keep those figures when the model is busy or the host cuts us off.
    }
  }

  const fromSearch = marketFromSnippets(q, years, results);
  if (!fromSearch) throw new Error(failures[0] ?? "no quoted prices");
  return finalize(fromSearch);
}
