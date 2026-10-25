/**
 * Electrified Toyotas sold in the United States, from the supplied Toyota
 * catalogue (pressroom.toyota.com and global.toyota references).
 *
 * One row per model, with the model-year span the catalogue lists. Hydrogen
 * fuel-cell (Mirai) and mild-hybrid entries are left out: neither is a hybrid
 * or plug-in a driver can treat like the cars this app compares. Non-US rows
 * are left out too.
 *
 * There are no prices, mileage figures or ranges here, because the catalogue
 * carries none. Only the vehicles in `config/candidates.ts` can be priced.
 */
export interface CatalogEntry {
  model: string;
  powertrain: "hybrid" | "phev" | "bev";
  category: string;
  body: string;
  yearFrom: number;
  yearTo: number;
  note: string;
}

export const ELECTRIFIED_CATALOG: CatalogEntry[] = [
  { model: "Corolla Hybrid", powertrain: "hybrid", category: "Car", body: "4-door sedan", yearFrom: 2020, yearTo: 2026, note: "Compact sedan with gasoline-electric hybrid propulsion." },
  { model: "Camry Hybrid", powertrain: "hybrid", category: "Car", body: "4-door sedan", yearFrom: 2007, yearTo: 2026, note: "Midsize family sedan. Every US Camry grade became hybrid for 2025." },
  { model: "Prius", powertrain: "hybrid", category: "Car", body: "5-door liftback", yearFrom: 2001, yearTo: 2026, note: "The efficiency benchmark. Fifth generation from 2023 is lower and quicker." },
  { model: "Prius c", powertrain: "hybrid", category: "Car", body: "5-door hatchback", yearFrom: 2012, yearTo: 2019, note: "Small urban hybrid hatchback. Discontinued after 2019." },
  { model: "Prius v", powertrain: "hybrid", category: "Car", body: "5-door wagon", yearFrom: 2012, yearTo: 2017, note: "Roomier Prius with a taller roof and larger cargo area. Discontinued." },
  { model: "Avalon Hybrid", powertrain: "hybrid", category: "Car", body: "4-door sedan", yearFrom: 2013, yearTo: 2022, note: "Large comfortable sedan. Discontinued after 2022." },
  { model: "Crown", powertrain: "hybrid", category: "Car", body: "4-door elevated sedan", yearFrom: 2023, yearTo: 2026, note: "Elevated sedan, standard all-wheel drive. Hybrid MAX grades available." },
  { model: "Corolla Cross Hybrid", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2023, yearTo: 2026, note: "Small hybrid crossover with electronic all-wheel drive." },
  { model: "RAV4 Hybrid", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2016, yearTo: 2026, note: "Compact crossover, the most popular electrified Toyota SUV." },
  { model: "Venza", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2021, yearTo: 2024, note: "Two-row hybrid crossover, quieter and more upscale than RAV4. Discontinued." },
  { model: "Crown Signia", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2025, yearTo: 2026, note: "Two-row hybrid crossover with an extended cargo area." },
  { model: "Highlander Hybrid", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2006, yearTo: 2026, note: "Three-row family crossover." },
  { model: "Grand Highlander Hybrid", powertrain: "hybrid", category: "SUV", body: "5-door crossover", yearFrom: 2024, yearTo: 2026, note: "Larger three-row crossover, conventional hybrid or Hybrid MAX." },
  { model: "Sienna", powertrain: "hybrid", category: "Van", body: "Minivan", yearFrom: 2021, yearTo: 2026, note: "Family minivan, hybrid-only since 2021. Sliding doors, up to eight seats." },
  { model: "4Runner i-FORCE MAX", powertrain: "hybrid", category: "SUV", body: "4-door SUV", yearFrom: 2025, yearTo: 2026, note: "Body-on-frame off-road SUV with a turbocharged hybrid powertrain." },
  { model: "Land Cruiser i-FORCE MAX", powertrain: "hybrid", category: "SUV", body: "5-door wagon", yearFrom: 2024, yearTo: 2026, note: "250-Series utility SUV, turbocharged hybrid." },
  { model: "Sequoia i-FORCE MAX", powertrain: "hybrid", category: "SUV", body: "5-door SUV", yearFrom: 2023, yearTo: 2026, note: "Full-size three-row SUV, twin-turbo V6 hybrid." },
  { model: "Tacoma i-FORCE MAX", powertrain: "hybrid", category: "Pickup", body: "Pickup truck", yearFrom: 2024, yearTo: 2026, note: "Midsize pickup with a turbocharged four-cylinder hybrid." },
  { model: "Tundra i-FORCE MAX", powertrain: "hybrid", category: "Pickup", body: "Pickup truck", yearFrom: 2022, yearTo: 2026, note: "Full-size pickup, twin-turbo V6 hybrid." },
  { model: "Prius Prime", powertrain: "phev", category: "Car", body: "5-door liftback", yearFrom: 2017, yearTo: 2024, note: "Plug-in Prius. Renamed Prius Plug-in Hybrid for 2025." },
  { model: "Prius Plug-in Hybrid", powertrain: "phev", category: "Car", body: "5-door liftback", yearFrom: 2025, yearTo: 2026, note: "The current plug-in Prius, same car as the later Prius Prime." },
  { model: "Prius Plug-in", powertrain: "phev", category: "Car", body: "5-door liftback", yearFrom: 2012, yearTo: 2015, note: "The first plug-in Prius, with a short electric range. Discontinued." },
  { model: "RAV4 Prime", powertrain: "phev", category: "SUV", body: "5-door crossover", yearFrom: 2021, yearTo: 2024, note: "Plug-in RAV4 with substantial electric range. Renamed RAV4 Plug-in Hybrid for 2025." },
  { model: "RAV4 Plug-in Hybrid", powertrain: "phev", category: "SUV", body: "5-door crossover", yearFrom: 2025, yearTo: 2026, note: "The current plug-in RAV4. Redesigned for 2026." },
  { model: "bZ4X", powertrain: "bev", category: "SUV", body: "5-door crossover", yearFrom: 2023, yearTo: 2025, note: "Battery-electric crossover developed with Subaru. Renamed bZ for 2026." },
  { model: "bZ", powertrain: "bev", category: "SUV", body: "5-door crossover", yearFrom: 2026, yearTo: 2026, note: "Updated bZ4X with revised charging and battery choices." },
  { model: "bZ Woodland", powertrain: "bev", category: "SUV", body: "5-door crossover", yearFrom: 2026, yearTo: 2026, note: "Longer electric crossover built around cargo room and outdoor use." },
  { model: "C-HR", powertrain: "bev", category: "SUV", body: "5-door crossover", yearFrom: 2026, yearTo: 2026, note: "Battery-electric compact crossover on a dedicated EV platform." },
  { model: "RAV4 EV", powertrain: "bev", category: "SUV", body: "5-door crossover", yearFrom: 2012, yearTo: 2014, note: "California-only electric RAV4 with a Tesla powertrain. Long discontinued, short range." },
];

/**
 * Catalogue rows a driver could realistically buy now, new or used. Ten years
 * keeps the early RAV4 EV out: its range and California-only sales make it a
 * poor suggestion whatever the budget.
 */
export function buyableToday(asOfYear: number): CatalogEntry[] {
  return ELECTRIFIED_CATALOG.filter((row) => row.yearTo >= asOfYear - 10);
}
