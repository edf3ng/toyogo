import { buyableToday, type CatalogEntry } from "@/config/electrified-catalog";
import { generateJson } from "@/lib/gemini";
import type { RankedSwitch, SwitchInput, SwitchResult } from "@/lib/engine/switch";

/** Figures only exist for vehicles the scorer can price. */
export interface PickFigures {
  paymentCents: number;
  annualFuelSavedCents: number;
  co2AvoidedLbs: number;
  paybackMonths: number;
}

export interface Pick {
  /** Short reason this one is on the list, e.g. "Best fit". */
  title: string;
  model: string;
  year: number;
  powertrain: CatalogEntry["powertrain"];
  body: string;
  why: string[];
  tradeoff: string;
  figures?: PickFigures;
}

export interface Advice {
  picks: Pick[];
  source: "gemini" | "engine";
}

const MAX_PICKS = 3;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    picks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          model: { type: "STRING" },
          year: { type: "NUMBER" },
          why: { type: "ARRAY", items: { type: "STRING" } },
          tradeoff: { type: "STRING" },
        },
        required: ["title", "model", "year", "why", "tradeoff"],
      },
    },
  },
  required: ["picks"],
};

const ACCESS_TEXT: Record<string, string> = {
  yes: "can charge at home",
  maybe: "might be able to charge at home",
  no: "cannot charge at home",
};

const POWERTRAIN_TEXT: Record<CatalogEntry["powertrain"], string> = {
  hybrid: "hybrid, never plugs in",
  phev: "plug-in hybrid",
  bev: "battery electric",
};

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Trim names the priced catalogue appends ("Camry Hybrid LE"). Only these are
 * dropped: a loose prefix match would make "Prius" swallow "Prius c" and
 * "Prius Prime", which are different cars with different powertrains.
 */
const TRIM_WORDS = new Set(["le", "se", "xle", "xse", "limited", "platinum", "nightshade", "trd", "sr", "sr5"]);

function sameModel(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const trimmed = (value: string) => {
    const words = value.trim().split(/\s+/);
    return words.length > 1 && TRIM_WORDS.has(words[words.length - 1].toLowerCase())
      ? words.slice(0, -1).join(" ")
      : value;
  };
  return norm(trimmed(a)) === norm(trimmed(b));
}

/** The scorer's figures for a pick, when it happens to be a vehicle we price. */
export function figuresFor(model: string, year: number, options: RankedSwitch[]): PickFigures | undefined {
  const match = options.find((option) => option.year === year && sameModel(option.model, model));
  if (!match) return undefined;
  return {
    paymentCents: match.paymentCents,
    annualFuelSavedCents: match.monthlyEnergySavingCents * 12,
    co2AvoidedLbs: Math.round(match.co2AvoidedLbs),
    paybackMonths: match.paybackMonths,
  };
}

export function rankedOptions(result: SwitchResult): RankedSwitch[] {
  return [result.winner, ...result.runners];
}

export function buildPrompt(input: SwitchInput, options: RankedSwitch[], catalog: CatalogEntry[]): string {
  const car = input.current;
  const priced = options
    .map((option) => {
      const payback = Number.isFinite(option.paybackMonths)
        ? `${Math.round(option.paybackMonths)} months`
        : "never on fuel alone";
      return `  ${option.year} ${option.model}: payment ${dollars(option.paymentCents)}/mo, fuel saved ${dollars(option.monthlyEnergySavingCents * 12)}/yr, CO2 avoided ${Math.round(option.co2AvoidedLbs)} lb/yr, payback ${payback}, verdict ${option.verdict}`;
    })
    .join("\n");

  return [
    `You advise one driver on which electrified Toyota to buy next. Choose exactly ${MAX_PICKS}.`,
    "",
    `Driver: about ${input.dailyMiles} miles a day, ${ACCESS_TEXT[input.chargeAccess] ?? "charging unknown"},`,
    `${input.stationCount} public chargers nearby, budget about ${dollars(input.budgetCents)} a month,`,
    `priorities: ${input.priorities.join(", ") || "none given"}.`,
    `They drive a ${car.year} ${car.model} with ${car.miles.toLocaleString("en-US")} miles today.`,
    "",
    "Catalogue. Pick only from these, and only a year inside the span shown:",
    ...catalog.map((row) => `  ${row.model} (${row.yearFrom}-${row.yearTo}, ${POWERTRAIN_TEXT[row.powertrain]}, ${row.body}) — ${row.note}`),
    "",
    "Figures are known for these, and for nothing else:",
    priced,
    "",
    "Rules:",
    `- Give ${MAX_PICKS} different models, each useful for a different reason, best first.`,
    "- Quote a dollar amount, a payback or a CO2 figure ONLY if it appears above, for that exact vehicle.",
    "  For anything else, compare in words (smaller, cheaper to buy used, more cargo) and give no numbers.",
    "- An older used year is a fair pick when the driver is short of money; say so plainly.",
    "- A battery EV is a poor fit for someone who cannot charge at home unless public charging is plentiful.",
    "- A plug-in hybrid only earns its price if a good share of the miles run on a charge.",
    "",
    'title: two or three words saying why this one is listed, e.g. "Best fit", "Most budget friendly",',
    '  "Lowest emissions", "Most cargo". Each title must be different.',
    "why: two or three short sentences, written to the driver as 'you'.",
    "tradeoff: one sentence on what they give up by taking this one.",
  ].join("\n");
}

function cleanLines(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    .map((line) => line.trim())
    .slice(0, limit);
}

/** Keeps an invented model, an impossible year or an empty field from reaching the page. */
export function parseAdvice(text: string, options: RankedSwitch[], catalog: CatalogEntry[]): Advice | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const rows = (raw as { picks?: unknown }).picks;
  if (!Array.isArray(rows)) return null;

  const picks: Pick[] = [];
  for (const row of rows) {
    const item = row as { title?: unknown; model?: unknown; year?: unknown; why?: unknown; tradeoff?: unknown };
    const entry = catalog.find((candidate) => sameModel(candidate.model, String(item.model ?? "")));
    const year = Number(item.year);
    if (!entry || !Number.isInteger(year) || year < entry.yearFrom || year > entry.yearTo) continue;
    if (picks.some((pick) => pick.model === entry.model)) continue;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 40) : "";
    const why = cleanLines(item.why, 3);
    const tradeoff = typeof item.tradeoff === "string" ? item.tradeoff.trim() : "";
    if (!title || why.length === 0 || !tradeoff) continue;
    picks.push({
      title,
      model: entry.model,
      year,
      powertrain: entry.powertrain,
      body: entry.body,
      why,
      tradeoff,
      figures: figuresFor(entry.model, year, options),
    });
    if (picks.length === MAX_PICKS) break;
  }
  return picks.length > 0 ? { picks, source: "gemini" } : null;
}

/** The scorer's own ranking, titled the same way, for when Gemini is unavailable. */
export function engineAdvice(options: RankedSwitch[], catalog: CatalogEntry[]): Advice | null {
  const titles = ["Best fit", "Runner-up", "Also considered"];
  const picks = options.slice(0, MAX_PICKS).map((option, index) => {
    const entry = catalog.find((row) => sameModel(row.model, option.model));
    const payback = Number.isFinite(option.paybackMonths)
      ? `The payment increase is paid back in about ${Math.round(option.paybackMonths)} months.`
      : "Fuel savings alone do not cover the payment increase.";
    return {
      title: titles[index] ?? "Also considered",
      model: entry?.model ?? option.model,
      year: option.year,
      powertrain: entry?.powertrain ?? "hybrid",
      body: entry?.body ?? "",
      why: [
        `It saves about ${dollars(option.monthlyEnergySavingCents * 12)} a year in fuel, at ${dollars(option.paymentCents)} a month.`,
        payback,
      ],
      tradeoff: "Ranked by the scorer only. The written comparison was unavailable.",
      figures: {
        paymentCents: option.paymentCents,
        annualFuelSavedCents: option.monthlyEnergySavingCents * 12,
        co2AvoidedLbs: Math.round(option.co2AvoidedLbs),
        paybackMonths: option.paybackMonths,
      },
    } satisfies Pick;
  });
  return picks.length > 0 ? { picks, source: "engine" } : null;
}

export async function recommendVehicle(
  input: SwitchInput,
  result: SwitchResult,
  geminiKey: string,
  model: string,
): Promise<Advice | null> {
  const options = rankedOptions(result);
  const catalog = buyableToday(Number(input.asOf.slice(0, 4)) || new Date().getUTCFullYear());
  if (options.length === 0) return null;
  try {
    const text = await generateJson(buildPrompt(input, options, catalog), geminiKey, model, SCHEMA);
    return parseAdvice(text, options, catalog) ?? engineAdvice(options, catalog);
  } catch {
    return engineAdvice(options, catalog);
  }
}
