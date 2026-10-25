import { NextResponse } from "next/server";
import { marketValue } from "@/lib/market";
import type { MarketValue } from "@/types/market";

const cache = new Map<string, MarketValue>();

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
    return NextResponse.json({ source: "none" }, { status: 400 });
  }

  const serpKey = process.env.SERPAPI_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!serpKey || !geminiKey) {
    return NextResponse.json({
      source: "none",
      reason: !serpKey && !geminiKey ? "missing-keys" : !serpKey ? "missing-serp" : "missing-gemini",
    });
  }

  // Rounded miles and sorted issues keep repeat visits off the SerpAPI quota.
  const cacheKey = [year, model.toLowerCase(), Math.round(miles / 1000), [...issues].sort().join(",")].join("|");
  const hit = cache.get(cacheKey);
  if (hit) return NextResponse.json({ source: "market", value: hit });

  try {
    const value = await marketValue(
      { year, model, miles, issues },
      serpKey,
      geminiKey,
      process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    );
    cache.set(cacheKey, value);
    return NextResponse.json({ source: "market", value });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ source: "none", reason });
  }
}
