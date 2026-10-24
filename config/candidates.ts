import type { Powertrain } from "@/types";

/**
 * Electrified Toyotas the scorer can recommend. Ids, MPG, kWh/100 mi, and CO2
 * are from the committed FuelEconomy.gov cache. Electric range is the EPA
 * `range` (BEV) or `rangeA` (PHEV), read from the live record on 2026-10-24.
 * Prices are example MSRPs, not stickers.
 */
export interface CandidateVehicle {
  id: string;
  year: number;
  model: string;
  label: string;
  powertrain: Exclude<Powertrain, "gas">;
  cityMpg: number;
  highwayMpg: number;
  combinedMpg: number;
  kwhPer100: number;
  co2TailpipeGpm: number;
  /** BEV total range, miles. 0 for a hybrid. */
  rangeMiles: number;
  /** PHEV charge-depleting range, miles. 0 otherwise. */
  electricRangeMiles: number;
  msrpCents: number;
  seats: number;
  cargoCuFt: number;
  horsepower: number;
}

export const CANDIDATES: CandidateVehicle[] = [
  {
    id: "49804",
    year: 2026,
    model: "Corolla Hybrid",
    label: "2026 Corolla Hybrid",
    powertrain: "hybrid",
    cityMpg: 53,
    highwayMpg: 46,
    combinedMpg: 50,
    kwhPer100: 0,
    co2TailpipeGpm: 176,
    rangeMiles: 0,
    electricRangeMiles: 0,
    msrpCents: 2_890_000,
    seats: 5,
    cargoCuFt: 13,
    horsepower: 138,
  },
  {
    id: "47092",
    year: 2024,
    model: "Camry Hybrid LE",
    label: "2024 Camry Hybrid",
    powertrain: "hybrid",
    cityMpg: 51,
    highwayMpg: 53,
    combinedMpg: 52,
    kwhPer100: 0,
    co2TailpipeGpm: 170,
    rangeMiles: 0,
    electricRangeMiles: 0,
    msrpCents: 3_350_000,
    seats: 5,
    cargoCuFt: 15,
    horsepower: 208,
  },
  {
    id: "48937",
    year: 2025,
    model: "RAV4 Hybrid AWD",
    label: "2025 RAV4 Hybrid",
    powertrain: "hybrid",
    cityMpg: 41,
    highwayMpg: 38,
    combinedMpg: 39,
    kwhPer100: 0,
    co2TailpipeGpm: 224,
    rangeMiles: 0,
    electricRangeMiles: 0,
    msrpCents: 3_550_000,
    seats: 5,
    cargoCuFt: 37,
    horsepower: 219,
  },
  {
    id: "49014",
    year: 2025,
    model: "Prius PHEV",
    label: "2025 Prius Prime",
    powertrain: "phev",
    cityMpg: 50,
    highwayMpg: 47,
    combinedMpg: 48,
    kwhPer100: 29,
    co2TailpipeGpm: 60,
    rangeMiles: 0,
    electricRangeMiles: 40,
    msrpCents: 3_690_000,
    seats: 5,
    cargoCuFt: 20,
    horsepower: 220,
  },
  {
    id: "47502",
    year: 2024,
    model: "RAV4 Prime 4WD",
    label: "2024 RAV4 Prime",
    powertrain: "phev",
    cityMpg: 40,
    highwayMpg: 36,
    combinedMpg: 38,
    kwhPer100: 36,
    co2TailpipeGpm: 72,
    rangeMiles: 0,
    electricRangeMiles: 42,
    msrpCents: 4_550_000,
    seats: 5,
    cargoCuFt: 33,
    horsepower: 302,
  },
  {
    id: "49126",
    year: 2025,
    model: "bZ4X",
    label: "2025 bZ4X",
    powertrain: "bev",
    cityMpg: 131,
    highwayMpg: 107,
    combinedMpg: 119,
    kwhPer100: 28.317,
    co2TailpipeGpm: 0,
    rangeMiles: 252,
    electricRangeMiles: 0,
    msrpCents: 4_520_000,
    seats: 5,
    cargoCuFt: 28,
    horsepower: 201,
  },
];

/**
 * The hybrid and plug-in in the same model line, plus the bZ when that line
 * has no battery EV of its own. A RAV4 is compared with the RAV4 Hybrid and
 * the RAV4 Prime. A Corolla is compared with the Corolla Hybrid and the bZ.
 */
export function candidatesFor(currentModel: string): CandidateVehicle[] {
  const model = currentModel.toLowerCase();
  if (model.includes("rav4")) {
    return CANDIDATES.filter((car) => /rav4/i.test(car.model));
  }
  if (model.includes("camry")) {
    return CANDIDATES.filter((car) => /camry/i.test(car.model) || car.powertrain === "bev");
  }
  if (model.includes("prius")) {
    return CANDIDATES.filter((car) => /prius/i.test(car.model) || car.powertrain === "bev");
  }
  return CANDIDATES.filter((car) => car.model === "Corolla Hybrid" || car.powertrain === "bev");
}
