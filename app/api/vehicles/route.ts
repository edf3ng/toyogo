import { NextResponse } from "next/server";
import {
  epaCache,
  fetchWithTimeout,
  replacementsFor,
  slimVehicle,
  toFacts,
  trimKey,
} from "@/lib/epa";

const EPA = "https://www.fueleconomy.gov/ws/rest";

function menuItems(payload: unknown): { text: string; value: string }[] {
  if (!payload || typeof payload !== "object" || !("menuItem" in payload)) return [];
  const menu = (payload as { menuItem?: unknown }).menuItem;
  if (!menu) return [];
  const list = Array.isArray(menu) ? menu : [menu];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { text?: unknown; value?: unknown };
    if (row.text == null || row.value == null) return [];
    return [{ text: String(row.text), value: String(row.value) }];
  });
}

function cacheBody(year: string | null, model: string | null) {
  if (!year) return { source: "cache", years: epaCache.years };
  if (!model) return { source: "cache", models: epaCache.modelsByYear[year] ?? [] };
  const trims = (epaCache.trimsByYearModel[trimKey(year, model)] ?? []).flatMap((item) => {
    const vehicle = epaCache.vehicles[item.id];
    if (!vehicle) return [];
    return [{ id: item.id, trim: item.trim, baseModel: vehicle.baseModel, facts: toFacts(vehicle) }];
  });
  return { source: "cache", trims };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = url.searchParams.get("year");
  const model = url.searchParams.get("model");
  const baseModel = url.searchParams.get("baseModel");

  if (url.searchParams.get("upgrades")) {
    return NextResponse.json(
      {
        source: "cache",
        replacements: replacementsFor(model ?? "", baseModel ?? model ?? ""),
      },
      { headers: { "x-source": "cache" } },
    );
  }

  try {
    if (!year) {
      const response = await fetchWithTimeout(`${EPA}/vehicle/menu/year`);
      const years = menuItems(await response.json())
        .map((item) => Number(item.value))
        .filter((value) => value >= 2018 && value <= 2026);
      if (years.length === 0) throw new Error("empty");
      return NextResponse.json({ source: "live", years }, { headers: { "x-source": "live" } });
    }

    if (!model) {
      const response = await fetchWithTimeout(
        `${EPA}/vehicle/menu/model?year=${year}&make=Toyota`,
      );
      const models = menuItems(await response.json()).map((item) => item.text);
      if (models.length === 0) throw new Error("empty");
      return NextResponse.json({ source: "live", models }, { headers: { "x-source": "live" } });
    }

    const response = await fetchWithTimeout(
      `${EPA}/vehicle/menu/options?year=${year}&make=Toyota&model=${encodeURIComponent(model)}`,
    );
    const options = menuItems(await response.json());
    if (options.length === 0) throw new Error("empty");
    const trims = [];
    for (const option of options) {
      const cached = epaCache.vehicles[option.value];
      const vehicleRes = cached
        ? null
        : await fetchWithTimeout(`${EPA}/vehicle/${option.value}`);
      const vehicle =
        cached ??
        slimVehicle(
          (await vehicleRes!.json()) as Record<string, string>,
          option.text,
        );
      trims.push({
        id: vehicle.id,
        trim: option.text,
        baseModel: vehicle.baseModel,
        facts: toFacts({ ...vehicle, trim: option.text }),
      });
    }
    return NextResponse.json({ source: "live", trims }, { headers: { "x-source": "live" } });
  } catch {
    return NextResponse.json(cacheBody(year, model), { headers: { "x-source": "cache" } });
  }
}
