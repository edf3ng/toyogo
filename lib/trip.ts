import { driverById, DRIVERS } from "@/data/drivers";
import { electricityCentsForState } from "@/config/energy";
import type { ChargeAccess } from "@/lib/engine/energy";
import type { SwitchInput } from "@/lib/engine/switch";
import type { Contract } from "@/types";

const TRIP_KEY = "toyogo-trip";

export interface GarageCar {
  id: string;
  year: number;
  model: string;
  label: string;
  cityMpg: number;
  highwayMpg: number;
  co2TailpipeGpm: number;
  msrpCents: number;
}

/** Gas Toyotas a driver can start from. Figures are the EPA cache plus example MSRPs. */
export const GARAGE: GarageCar[] = [
  {
    id: "40241",
    year: 2019,
    model: "Corolla",
    label: "2019 Corolla",
    cityMpg: 28,
    highwayMpg: 36,
    co2TailpipeGpm: 281,
    msrpCents: 2_350_000,
  },
  {
    id: "42959",
    year: 2021,
    model: "RAV4",
    label: "2021 RAV4",
    cityMpg: 27,
    highwayMpg: 35,
    co2TailpipeGpm: 296,
    msrpCents: 3_280_000,
  },
  {
    id: "38880",
    year: 2018,
    model: "Camry",
    label: "2018 Camry",
    cityMpg: 29,
    highwayMpg: 41,
    co2TailpipeGpm: 264,
    msrpCents: 3_050_000,
  },
];

export interface SavedTrip {
  source: "alex" | "blair" | "casey" | "custom";
  name: string;
  place: string;
  zip: string;
  paint: string;
  /** Free text from signup. Shown on the verdict, never scored. */
  other: string;
  input: SwitchInput;
}

export function stateFromZip(zip: string): string {
  if (zip.startsWith("9")) return "CA";
  if (zip.startsWith("1")) return "NY";
  return "TX";
}

/** Home charging wins. Otherwise Austin has stations and a rural ZIP does not. */
export function stationsFor(zip: string, access: ChargeAccess): number {
  if (access === "yes" || access === "maybe") return 8;
  if (zip.startsWith("787")) return 8;
  return 0;
}

export function tripFromDriver(id: "alex" | "blair" | "casey"): SavedTrip {
  const driver = DRIVERS.find((item) => item.id === id) ?? driverById(id);
  return {
    source: id,
    name: driver.name,
    place: driver.place,
    zip: id === "casey" ? "76825" : "78704",
    paint: "#1F4E79",
    other: "",
    input: driver.input,
  };
}

export function buildTrip(form: {
  name: string;
  zip: string;
  car: GarageCar;
  miles: number;
  finance: "owned" | "loan" | "lease";
  monthsElapsed: number;
  budgetCents: number;
  charge: ChargeAccess;
  dailyMiles: number;
  priorities: SwitchInput["priorities"];
  paint: string;
  other: string;
}): SavedTrip {
  const state = stateFromZip(form.zip);
  let contract: Contract = { kind: "owned" };
  if (form.finance === "loan") {
    contract = {
      kind: "loan",
      principalCents: form.car.msrpCents,
      annualRate: 0.049,
      months: 60,
      monthsElapsed: form.monthsElapsed,
    };
  } else if (form.finance === "lease") {
    contract = {
      kind: "lease",
      capCostCents: form.car.msrpCents,
      residualCents: Math.round(form.car.msrpCents * 0.55),
      moneyFactor: 0.069 / 24,
      months: 36,
      monthsElapsed: form.monthsElapsed,
      payoffCents: Math.round(form.car.msrpCents * 0.5),
    };
  }
  const input: SwitchInput = {
    asOf: "2026-10-24",
    current: {
      id: form.car.id,
      year: form.car.year,
      model: form.car.model,
      cityMpg: form.car.cityMpg,
      highwayMpg: form.car.highwayMpg,
      co2TailpipeGpm: form.car.co2TailpipeGpm,
      msrpCents: form.car.msrpCents,
      miles: form.miles,
    },
    contract,
    dailyMiles: form.dailyMiles,
    mix: "mix",
    chargeAccess: form.charge,
    stationCount: stationsFor(form.zip, form.charge),
    budgetCents: form.budgetCents,
    cashDownCents: 0,
    priorities: form.priorities,
    gasDollarsPerGallon: 4.28,
    electricityCentsPerKwh: electricityCentsForState(state),
  };
  return {
    source: "custom",
    name: form.name || "Driver",
    place: state === "TX" && form.zip.startsWith("787") ? "Austin" : state,
    zip: form.zip,
    paint: form.paint,
    other: form.other.trim(),
    input,
  };
}

export function readTrip(): SavedTrip | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(TRIP_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedTrip;
    if (!parsed?.input?.current) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTrip(trip: SavedTrip) {
  sessionStorage.setItem(TRIP_KEY, JSON.stringify(trip));
}
