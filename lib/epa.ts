import { exampleMsrpCents } from "@/config/vehicles";
import { modelMatchesTarget, UPGRADE_MAP, upgradeKey } from "@/config/upgrades";
import type { FuelPrices, Powertrain, ReplacementVehicle, UpgradeRole, VehicleFacts } from "@/types";
import cacheJson from "@/data/epa-cache.json";

export interface CachedVehicle {
  id: string;
  year: number;
  model: string;
  baseModel: string;
  trim: string;
  cityMpg: number;
  highwayMpg: number;
  combinedMpg: number;
  kwhPer100: number;
  co2TailpipeGpm: number;
  powertrain: Powertrain;
  fuelType: string;
}

export interface EpaCache {
  fetchedAt: string;
  fuelPrices: FuelPrices;
  years: number[];
  modelsByYear: Record<string, string[]>;
  trimsByYearModel: Record<string, { id: string; trim: string }[]>;
  vehicles: Record<string, CachedVehicle>;
}

export const epaCache = cacheJson as EpaCache;

export function slimVehicle(
  raw: Record<string, string | number | null | undefined>,
  trim: string,
): CachedVehicle {
  const model = String(raw.model ?? "");
  const fuelType = String(raw.fuelType1 ?? "Regular Gasoline");
  const fuel2 = String(raw.fuelType2 ?? "");
  const bev = fuelType === "Electricity";
  const phev =
    String(raw.phevBlended) === "true" ||
    (fuel2 === "Electricity" && !bev && Number(raw.combE) > 0);
  let powertrain: Powertrain = "gas";
  if (bev) powertrain = "bev";
  else if (phev) powertrain = "phev";
  else if (/hybrid/i.test(model)) powertrain = "hybrid";
  return {
    id: String(raw.id),
    year: Number(raw.year),
    model,
    baseModel: String(raw.baseModel || model),
    trim,
    cityMpg: Number(raw.city08) || 0,
    highwayMpg: Number(raw.highway08) || 0,
    combinedMpg: Number(raw.comb08) || 0,
    kwhPer100: Number(raw.combE) || 0,
    co2TailpipeGpm: Number(raw.co2TailpipeGpm) || 0,
    powertrain,
    fuelType,
  };
}

export function toFacts(vehicle: CachedVehicle): VehicleFacts {
  return {
    id: vehicle.id,
    year: vehicle.year,
    model: vehicle.model,
    trim: vehicle.trim,
    cityMpg: vehicle.cityMpg,
    highwayMpg: vehicle.highwayMpg,
    combinedMpg: vehicle.combinedMpg,
    kwhPer100: vehicle.kwhPer100,
    co2TailpipeGpm: vehicle.co2TailpipeGpm,
    powertrain: vehicle.powertrain,
    fuelType: vehicle.fuelType,
    msrpCents: exampleMsrpCents(vehicle.model),
  };
}

export function trimKey(year: number | string, model: string): string {
  return `${year}|${model}`;
}

const ROLES: UpgradeRole[] = ["trade", "hybrid", "phev", "bev"];

export function replacementsFor(model: string, baseModel: string): ReplacementVehicle[] {
  const key = upgradeKey(baseModel, model);
  if (!key) return [];
  const mapping = UPGRADE_MAP[key];
  const found: ReplacementVehicle[] = [];
  for (const role of ROLES) {
    const target = mapping[role];
    if (!target) continue;
    const pool = Object.values(epaCache.vehicles).filter((vehicle) =>
      modelMatchesTarget(vehicle.model, target),
    );
    if (pool.length === 0) continue;
    pool.sort(
      (a, b) => b.year - a.year || a.model.length - b.model.length || a.id.localeCompare(b.id),
    );
    const best = pool[0];
    const facts = toFacts(best);
    found.push({ ...facts, role, label: `${best.year} ${best.model}` });
  }
  return found;
}

export async function fetchWithTimeout(url: string, ms = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "NextMove/1.0 (hackathon demo)",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(String(response.status));
    return response;
  } finally {
    clearTimeout(timer);
  }
}
