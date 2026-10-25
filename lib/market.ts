import type { MarketValue } from "@/types/market";

const SERP = "https://serpapi.com/search.json";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
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

/** Models tried in turn when the configured one is overloaded. */
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
/** A loaded model has been seen to take over a minute to answer. */
const ATTEMPT_TIMEOUT_MS = 100_000;
/** Total budget for the Gemini step, across every retry and fallback. */
const DEADLINE_MS = 150_000;

/**
 * Gemini answers 503 whenever a model is busy, which happens in bursts lasting
 * tens of seconds, and a busy model can also take over a minute to answer.
 * Attempts cycle through the models with a growing backoff until the deadline,
 * because a fixed number of tries is spent within seconds during a burst.
 */
async function generate(prompt: string, geminiKey: string, model: string): Promise<string> {
  const models = [model, ...FALLBACK_MODELS.filter((name) => name !== model)];
  const giveUpAt = Date.now() + DEADLINE_MS;
  let last = new Error("gemini unreachable");
  // A model the key cannot use at all answers 404, so it is dropped rather than
  // tried again on every round.
  const dead = new Set<string>();
  for (let attempt = 0; ; attempt += 1) {
    const live = models.filter((name) => !dead.has(name));
    if (live.length === 0) throw last;
    const name = live[attempt % live.length];
    const left = giveUpAt - Date.now();
    if (left <= 0) throw last;
    try {
      const response = await fetch(`${GEMINI}/${name}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, left)),
        headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            // Reading prices out of snippets needs little deliberation, and the
            // default budget costs about a minute. Only Gemini 3 takes this field.
            ...(name.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
          },
        }),
      });
      // A 4xx other than 429 means this model will not serve this request, so
      // retrying it on later rounds would only burn the deadline.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        dead.add(name);
        throw new Error(`gemini ${response.status}`);
      }
      if (!response.ok) throw new Error(`gemini ${response.status}`);
      const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!text.trim()) throw new Error("empty");
      return text;
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
      // Wait only once every model has been tried, and cap the backoff so a
      // burst that clears early is not waited out.
      const round = Math.floor(attempt / live.length);
      const delay = attempt % live.length === live.length - 1 ? Math.min(1000 * 2 ** round, 8000) : 0;
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(delay, giveUpAt - Date.now())));
    }
  }
  throw last;
}

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

  const text = await generate(prompt, geminiKey, model);
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
