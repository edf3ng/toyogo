import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { marketValue } from "@/lib/market";
import type { MarketValue } from "@/types/market";

export const runtime = "nodejs";
export const maxDuration = 60;

const memory = new Map<string, MarketValue>();

function cacheKey(year: number, model: string, miles: number, issues: string[]): string {
  return [year, model.toLowerCase(), Math.round(miles / 1000), [...issues].sort().join(",")].join("|");
}

async function loadMarket(year: number, model: string, miles: number, issues: string[]): Promise<MarketValue> {
  const serpKey = process.env.SERPAPI_KEY ?? "";
  if (!serpKey) throw new Error("missing-serp");
  return marketValue(
    { year, model, miles, issues },
    serpKey,
    process.env.GEMINI_API_KEY ?? "",
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    year?: unknown;
    model?: unknown;
    miles?: unknown;
    issues?: unknown;
  } | null;
  const year = Number(body?.year);
  const miles = Number(body?.miles);
  const model = typeof body?.model === "string" ? body.model.trim().slice(0, 60) : "";
  const issues = Array.isArray(body?.issues) ? body.issues.filter((i): i is string => typeof i === "string") : [];
  if (!model || !Number.isFinite(year) || !Number.isFinite(miles) || miles < 0) {
    return NextResponse.json({ source: "none", reason: "bad-request" }, { status: 400 });
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ source: "none", reason: "missing-serp" }, { headers: { "x-source": "none" } });
  }

  const key = cacheKey(year, model, miles, issues);
  const warm = memory.get(key);
  if (warm) return NextResponse.json({ source: "market", value: warm }, { headers: { "x-source": "cache" } });

  try {
    const value = await unstable_cache(() => loadMarket(year, model, miles, issues), ["market-value", key], {
      revalidate: 86_400,
    })();
    memory.set(key, value);
    return NextResponse.json({ source: "market", value }, { headers: { "x-source": "market" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ source: "none", reason }, { headers: { "x-source": "none" } });
  }
}
