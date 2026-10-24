import { NextResponse } from "next/server";

const FALLBACK: Record<string, { lat: number; lon: number; place: string; state: string }> = {
  "78704": { lat: 30.245, lon: -97.769, place: "Austin", state: "TX" },
  "78701": { lat: 30.272, lon: -97.744, place: "Austin", state: "TX" },
  "76825": { lat: 31.392, lon: -99.854, place: "Brady", state: "TX" },
};

export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip")?.replace(/\D/g, "").slice(0, 5) ?? "";
  const fallback = FALLBACK[zip] ?? { lat: 30.267, lon: -97.743, place: "Austin", state: "TX" };
  if (zip.length !== 5) {
    return NextResponse.json({ ...fallback, source: "cache" }, { headers: { "x-source": "cache" } });
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error("zip");
    const body = (await response.json()) as {
      places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[];
    };
    const place = body.places?.[0];
    if (!place) throw new Error("empty");
    return NextResponse.json(
      {
        lat: Number(place.latitude),
        lon: Number(place.longitude),
        place: place["place name"],
        state: place["state abbreviation"],
        source: "live",
      },
      { headers: { "x-source": "live" } },
    );
  } catch {
    return NextResponse.json({ ...fallback, source: "cache" }, { headers: { "x-source": "cache" } });
  }
}
