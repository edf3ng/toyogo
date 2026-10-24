import { FALLBACK_FUEL_PRICES, FUEL } from "@/config/fuel";
import type {
  AnalysisInput,
  DrivingProfile,
  ReplacementVehicle,
  VehicleFacts,
} from "@/types";

export const AS_OF = "2026-10-24";

function vehicle(
  facts: Omit<VehicleFacts, "msrpCents"> & { msrpCents: number },
): VehicleFacts {
  return facts;
}

const corolla: VehicleFacts = vehicle({
  id: "45931",
  year: 2023,
  model: "Corolla",
  trim: "Auto (AV-S10), 4 cyl, 2.0 L, SIDI & PFI",
  cityMpg: 32,
  highwayMpg: 41,
  combinedMpg: 35,
  kwhPer100: 0,
  co2TailpipeGpm: 254,
  powertrain: "gas",
  fuelType: "Regular Gasoline",
  msrpCents: 2_350_000,
});

const newCorolla: ReplacementVehicle = {
  ...vehicle({
    id: "49809",
    year: 2026,
    model: "Corolla",
    trim: "Auto (AV-S10), 4 cyl, 2.0 L",
    cityMpg: 31,
    highwayMpg: 38,
    combinedMpg: 34,
    kwhPer100: 0,
    co2TailpipeGpm: 265,
    powertrain: "gas",
    fuelType: "Regular Gasoline",
    msrpCents: 2_350_000,
  }),
  role: "trade",
  label: "2026 Corolla",
};

const corollaHybrid: ReplacementVehicle = {
  ...vehicle({
    id: "47339",
    year: 2024,
    model: "Corolla Hybrid",
    trim: "Auto (variable gear ratios), 4 cyl, 1.8 L",
    cityMpg: 53,
    highwayMpg: 46,
    combinedMpg: 50,
    kwhPer100: 0,
    co2TailpipeGpm: 176,
    powertrain: "hybrid",
    fuelType: "Regular Gasoline",
    msrpCents: 2_890_000,
  }),
  role: "hybrid",
  label: "2024 Corolla Hybrid",
};

const priusPrime: ReplacementVehicle = {
  ...vehicle({
    id: "47500",
    year: 2024,
    model: "Prius Prime",
    trim: "Auto (variable gear ratios), 4 cyl, 2.0 L",
    cityMpg: 50,
    highwayMpg: 47,
    combinedMpg: 48,
    kwhPer100: 29,
    co2TailpipeGpm: 60,
    powertrain: "phev",
    fuelType: "Regular Gasoline",
    msrpCents: 3_690_000,
  }),
  role: "phev",
  label: "2024 Prius Prime",
};

const bz4x: ReplacementVehicle = {
  ...vehicle({
    id: "47918",
    year: 2024,
    model: "bZ4X",
    trim: "Auto (A1)",
    cityMpg: 131,
    highwayMpg: 107,
    combinedMpg: 119,
    kwhPer100: 28.317,
    co2TailpipeGpm: 0,
    powertrain: "bev",
    fuelType: "Electricity",
    msrpCents: 4_520_000,
  }),
  role: "bev",
  label: "2024 bZ4X",
};

const tacoma: VehicleFacts = vehicle({
  id: "47602",
  year: 2024,
  model: "Tacoma 4WD",
  trim: "Auto (S8), 4 cyl, 2.4 L, Turbo",
  cityMpg: 19,
  highwayMpg: 24,
  combinedMpg: 21,
  kwhPer100: 0,
  co2TailpipeGpm: 424,
  powertrain: "gas",
  fuelType: "Regular Gasoline",
  msrpCents: 4_150_000,
});

const tacomaNext: ReplacementVehicle = {
  ...tacoma,
  id: "47602-next",
  role: "trade",
  label: "2026 Tacoma 4WD",
  year: 2026,
};

const tacomaHybrid: ReplacementVehicle = {
  ...vehicle({
    id: "48460",
    year: 2024,
    model: "Tacoma Hybrid 4WD",
    trim: "Auto (S8), 4 cyl, 2.4 L, Turbo; Hybrid",
    cityMpg: 23,
    highwayMpg: 24,
    combinedMpg: 24,
    kwhPer100: 0,
    co2TailpipeGpm: 379,
    powertrain: "hybrid",
    fuelType: "Regular Gasoline",
    msrpCents: 4_780_000,
  }),
  role: "hybrid",
  label: "2024 Tacoma Hybrid",
};

const highlander: VehicleFacts = vehicle({
  id: "44649",
  year: 2022,
  model: "Highlander",
  trim: "Auto (S8), 6 cyl, 3.5 L, SIDI & PFI",
  cityMpg: 20,
  highwayMpg: 28,
  combinedMpg: 23,
  kwhPer100: 0,
  co2TailpipeGpm: 389,
  powertrain: "gas",
  fuelType: "Regular Gasoline",
  msrpCents: 4_620_000,
});

const grandHighlander: ReplacementVehicle = {
  ...vehicle({
    id: "46741",
    year: 2024,
    model: "Grand Highlander Hybrid",
    trim: "Auto (AV-S6), 4 cyl, 2.5 L",
    cityMpg: 37,
    highwayMpg: 34,
    combinedMpg: 36,
    kwhPer100: 0,
    co2TailpipeGpm: 246,
    powertrain: "hybrid",
    fuelType: "Regular Gasoline",
    msrpCents: 5_950_000,
  }),
  role: "trade",
  label: "2024 Grand Highlander Hybrid",
};

const highlanderHybrid: ReplacementVehicle = {
  ...vehicle({
    id: "47636",
    year: 2024,
    model: "Highlander Hybrid",
    trim: "Auto (AV-S6), 4 cyl, 2.5 L",
    cityMpg: 36,
    highwayMpg: 35,
    combinedMpg: 36,
    kwhPer100: 0,
    co2TailpipeGpm: 245,
    powertrain: "hybrid",
    fuelType: "Regular Gasoline",
    msrpCents: 4_980_000,
  }),
  role: "hybrid",
  label: "2024 Highlander Hybrid",
};

export interface Persona {
  id: string;
  title: string;
  /** Only set when the brief names the customer. */
  name?: string;
  blurb: string;
  base: AnalysisInput;
}

const shared = {
  asOf: AS_OF,
  fuelPrices: FALLBACK_FUEL_PRICES,
  packagesCents: 0,
  electricityRateCentsPerKwh: FUEL.electricityRateCentsPerKwh,
};

export const PERSONAS: Persona[] = [
  {
    id: "elena",
    title: "Lease ending",
    name: "Elena",
    blurb: "2023 Corolla LE · lease ends in about 90 days",
    base: {
      ...shared,
      modelYear: 2023,
      mileage: 27_000,
      current: corolla,
      replacements: [newCorolla, corollaHybrid, priusPrime, bz4x],
      contract: {
        kind: "lease",
        capCostCents: 2_350_000,
        residualCents: 1_410_000,
        moneyFactor: 0.0018,
        months: 36,
        monthsElapsed: 33,
        payoffCents: 850_000,
      },
      driving: {
        annualMiles: 10_000,
        mix: "mix",
        horizon: "under_1",
        priority: "lowest_payment",
        upcoming: "lease_ending",
        comfortablePaymentCents: 65_000,
        availableCashCents: 0,
      },
    },
  },
  {
    id: "income",
    title: "Income dip",
    blurb: "2024 Tacoma · payment due, income disrupted",
    base: {
      ...shared,
      modelYear: 2024,
      mileage: 19_000,
      current: tacoma,
      replacements: [tacomaNext, tacomaHybrid],
      contract: {
        kind: "loan",
        principalCents: 4_150_000,
        annualRate: 0.029,
        months: 60,
        monthsElapsed: 14,
      },
      driving: {
        annualMiles: 15_000,
        mix: "mix",
        horizon: "3_plus",
        priority: "lowest_payment",
        upcoming: "income_change",
        comfortablePaymentCents: 74_386,
        availableCashCents: 0,
      },
    },
  },
  {
    id: "equity",
    title: "Equity upgrade",
    blurb: "2022 Highlander · wants more room",
    base: {
      ...shared,
      modelYear: 2022,
      mileage: 54_000,
      current: highlander,
      replacements: [grandHighlander, highlanderHybrid],
      contract: {
        kind: "loan",
        principalCents: 4_000_000,
        annualRate: 0.059,
        months: 72,
        monthsElapsed: 42,
      },
      driving: {
        annualMiles: 12_000,
        mix: "city",
        horizon: "under_1",
        priority: "newest_car",
        upcoming: "none",
        comfortablePaymentCents: 120_000,
        availableCashCents: 0,
      },
    },
  },
];

export function personaById(id: string | null): Persona | undefined {
  return PERSONAS.find((persona) => persona.id === id);
}

export function analysisFor(
  persona: Persona,
  driving?: Partial<DrivingProfile>,
  packagesCents = 0,
): AnalysisInput {
  return {
    ...persona.base,
    packagesCents,
    driving: { ...persona.base.driving, ...driving },
    replacements: persona.base.replacements.map((item) => ({
      ...item,
    })),
  };
}
