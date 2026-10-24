import { NextResponse } from "next/server";
import cache from "@/data/chargers-austin.json";

interface RawPoi {
  ID: number;
  AddressInfo?: {
    Title?: string;
    Latitude?: number;
    Longitude?: number;
    AddressLine1?: string;
    Town?: string;
  };
}

function slim(poi: RawPoi) {
  return {
    id: poi.ID,
    title: poi.AddressInfo?.Title ?? "Charger",
    lat: poi.AddressInfo?.Latitude ?? 0,
    lon: poi.AddressInfo?.Longitude ?? 0,
    address: poi.AddressInfo?.AddressLine1 ?? "",
    town: poi.AddressInfo?.Town ?? "",
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const miles = Math.min(50, Math.max(1, Number(params.get("miles")) || 10));
  const key = process.env.OPENCHARGEMAP_API_KEY;
  const cached = NextResponse.json(
    {
      source: "cache",
      stations: cache.stations,
      note: "Showing the saved Austin sample. Live Open Charge Map did not answer in time.",
    },
    { headers: { "x-source": "cache" } },
  );
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lon)) return cached;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lon}&distance=${miles}&distanceunit=Miles&maxresults=40&compact=true&verbose=false`;
    const response = await fetch(url, {
      headers: { "X-API-Key": key, Accept: "application/json", "User-Agent": "ToyoGo/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return cached;
    const body = (await response.json()) as RawPoi[];
    const stations = body.map(slim).filter((station) => station.lat !== 0 && station.lon !== 0);
    if (stations.length === 0) return cached;
    return NextResponse.json({ source: "live", stations }, { headers: { "x-source": "live" } });
  } catch {
    return cached;
  }
}
