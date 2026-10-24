import catalog from "@/data/garage-catalog.json";
import { exampleMsrpCents } from "@/config/vehicles";

export interface GarageRow {
  id: string;
  year: number;
  model: string;
  cityMpg: number;
  highwayMpg: number;
  co2TailpipeGpm: number;
  powertrain: string;
}

/** Petrol and hybrid Toyotas from the FuelEconomy.gov cache. One row per year and model. */
export const GARAGE: GarageRow[] = (catalog as GarageRow[]).filter(
  (row) => row.powertrain === "gas" || row.powertrain === "hybrid",
);

export function garageYears(): number[] {
  return [...new Set(GARAGE.map((row) => row.year))];
}

export function modelsForYear(year: number): GarageRow[] {
  return GARAGE.filter((row) => row.year === year);
}

export function garageCar(id: string): GarageRow {
  return GARAGE.find((row) => row.id === id) ?? GARAGE[0];
}

export function garageMsrpCents(model: string): number {
  return exampleMsrpCents(model);
}
