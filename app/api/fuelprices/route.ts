import { NextResponse } from "next/server";
import { FUEL } from "@/config/fuel";
import { epaCache, fetchWithTimeout } from "@/lib/epa";
import type { FuelPrices } from "@/types";

const EPA = "https://www.fueleconomy.gov/ws/rest/fuelprices";

function electricityRateCents(): number {
  const raw = process.env.ELECTRICITY_RATE;
  if (!raw) return FUEL.electricityRateCentsPerKwh;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return FUEL.electricityRateCentsPerKwh;
  return value < 2 ? Math.round(value * 100) : Math.round(value);
}

function pricesFrom(raw: Record<string, unknown>): FuelPrices {
  return {
    regular: Number(raw.regular),
    midgrade: Number(raw.midgrade),
    premium: Number(raw.premium),
    diesel: Number(raw.diesel),
    electric: Number(raw.electric),
  };
}

export async function GET() {
  const electricityRateCentsPerKwh = electricityRateCents();
  try {
    const response = await fetchWithTimeout(EPA);
    const prices = pricesFrom(await response.json());
    if (!Number.isFinite(prices.regular)) throw new Error("bad payload");
    return NextResponse.json(
      { source: "live", prices, electricityRateCents: electricityRateCentsPerKwh },
      { headers: { "x-source": "live" } },
    );
  } catch {
    return NextResponse.json(
      {
        source: "cache",
        prices: epaCache.fuelPrices,
        electricityRateCents: electricityRateCentsPerKwh,
      },
      { headers: { "x-source": "cache" } },
    );
  }
}
