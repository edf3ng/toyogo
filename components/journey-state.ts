import { AS_OF } from "@/data/personas";
import { packageTotalCents } from "@/config/vehicles";
import type {
  AnalysisInput,
  Contract,
  DrivingProfile,
  FuelPrices,
  LeaseContract,
  LoanContract,
  ReplacementVehicle,
  VehicleFacts,
} from "@/types";

export interface JourneyState {
  step: 1 | 2 | 3 | 4;
  personaId: string | null;
  year: number | null;
  model: string | null;
  baseModel: string | null;
  vehicle: VehicleFacts | null;
  replacements: ReplacementVehicle[];
  mileage: number;
  ownership: "owned" | "loan" | "lease";
  loan: LoanContract;
  lease: LeaseContract;
  driving: DrivingProfile;
  paintId: string;
  packageIds: string[];
  fuelPrices: FuelPrices;
  electricityRateCentsPerKwh: number;
}

export function toAnalysis(state: JourneyState): AnalysisInput | null {
  if (!state.vehicle || !state.year) return null;
  let contract: Contract;
  if (state.ownership === "owned") contract = { kind: "owned" };
  else if (state.ownership === "loan") contract = state.loan;
  else contract = state.lease;
  return {
    asOf: AS_OF,
    modelYear: state.year,
    mileage: state.mileage,
    contract,
    driving: state.driving,
    current: state.vehicle,
    replacements: state.replacements,
    fuelPrices: state.fuelPrices,
    packagesCents: packageTotalCents(state.packageIds),
    electricityRateCentsPerKwh: state.electricityRateCentsPerKwh,
  };
}
