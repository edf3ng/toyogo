import { ENERGY, electricityCentsForState } from "@/config/energy";
import type { ChargeAccess } from "@/lib/engine/energy";
import type { SwitchInput } from "@/lib/engine/switch";
import { garageCar, garageMsrpCents, type GarageRow } from "@/lib/garage";
import type { Contract } from "@/types";

const TRIP_KEY = "toyogo-trip";

export interface SavedTrip {
  name: string;
  zip: string;
  place: string;
  paint: string;
  other: string;
  acquired: "new" | "cpo" | "used" | null;
  purchasedOn: string;
  agreementName: string;
  input: SwitchInput;
}

export function stateFromZip(zip: string): string {
  if (zip.startsWith("9")) return "CA";
  if (zip.startsWith("1")) return "NY";
  return "TX";
}

export function stationsFor(zip: string, access: ChargeAccess): number {
  if (access === "yes" || access === "maybe") return 8;
  if (zip.startsWith("787")) return 8;
  return 0;
}

export function buildTrip(form: {
  name: string;
  zip: string;
  car: GarageRow;
  miles: number;
  finance: "owned" | "loan" | "lease";
  monthsElapsed: number;
  loanMonths: number;
  apr: number;
  principalCents: number;
  payoffCents: number;
  statedPaymentCents: number;
  budgetCents: number;
  charge: ChargeAccess;
  dailyMiles: number;
  priorities: SwitchInput["priorities"];
  paint: string;
  other: string;
  issues: string[];
  acquired: "new" | "cpo" | "used" | null;
  purchasedOn: string;
  agreementName: string;
}): SavedTrip {
  const state = stateFromZip(form.zip);
  const msrp = garageMsrpCents(form.car.model);
  let contract: Contract = { kind: "owned" };
  if (form.finance === "loan") {
    contract = {
      kind: "loan",
      principalCents: form.principalCents || msrp,
      annualRate: form.apr,
      months: form.loanMonths,
      monthsElapsed: form.monthsElapsed,
    };
  } else if (form.finance === "lease") {
    contract = {
      kind: "lease",
      capCostCents: form.principalCents || msrp,
      residualCents: Math.round((form.principalCents || msrp) * 0.55),
      moneyFactor: form.apr / 24,
      months: form.loanMonths,
      monthsElapsed: form.monthsElapsed,
      payoffCents: form.payoffCents,
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
      msrpCents: msrp,
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
    gasDollarsPerGallon: ENERGY.fallbackGasDollarsPerGallon,
    electricityCentsPerKwh: electricityCentsForState(state),
    issues: form.issues,
    statedPaymentCents: form.statedPaymentCents > 0 ? form.statedPaymentCents : undefined,
  };
  return {
    name: form.name || "Driver",
    place: state === "TX" && form.zip.startsWith("787") ? "Austin" : state,
    zip: form.zip,
    paint: form.paint,
    other: form.other.trim(),
    acquired: form.acquired,
    purchasedOn: form.purchasedOn,
    agreementName: form.agreementName,
    input,
  };
}

export function readTrip(): SavedTrip | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(TRIP_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedTrip;
    if (!parsed?.input?.current || parsed.input.current.model === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTrip(trip: SavedTrip) {
  sessionStorage.setItem(TRIP_KEY, JSON.stringify(trip));
}

export function clearTrip() {
  sessionStorage.removeItem(TRIP_KEY);
}

export function carFromTrip(trip: SavedTrip): GarageRow {
  return garageCar(trip.input.current.id);
}
