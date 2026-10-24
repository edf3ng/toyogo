export type Cents = number;

export type DriveMix = "city" | "highway" | "mix";
export type KeepHorizon = "under_1" | "1_to_3" | "3_plus" | "unsure";
export type Priority =
  | "lowest_payment"
  | "lowest_total"
  | "newest_car"
  | "lowest_emissions";
export type Upcoming = "lease_ending" | "repair_needed" | "income_change" | "none";
export type MoveId =
  | "KEEP"
  | "PAY_OFF_EARLY"
  | "REFINANCE"
  | "TRADE_UP"
  | "LEASE_BUYOUT"
  | "LEASE_RETURN"
  | "HYBRID_UPGRADE"
  | "DEFER_PAYMENT";
export type Powertrain = "gas" | "hybrid" | "phev" | "bev";
export type UpgradeRole = "trade" | "hybrid" | "phev" | "bev";
export type NextStepKind = "SELF_SERVICE" | "ELIGIBLE_OFFER" | "FOLLOW_UP";

export interface VehicleFacts {
  id: string;
  year: number;
  model: string;
  trim: string;
  cityMpg: number;
  highwayMpg: number;
  combinedMpg: number;
  kwhPer100: number;
  co2TailpipeGpm: number;
  powertrain: Powertrain;
  fuelType: string;
  msrpCents: Cents;
}

export interface ReplacementVehicle extends VehicleFacts {
  role: UpgradeRole;
  label: string;
}

export interface LoanContract {
  kind: "loan";
  principalCents: Cents;
  annualRate: number;
  months: number;
  monthsElapsed: number;
}

export interface LeaseContract {
  kind: "lease";
  capCostCents: Cents;
  residualCents: Cents;
  moneyFactor: number;
  months: number;
  monthsElapsed: number;
  /** Published payoff quote. Example figure, not a TFS calculation. */
  payoffCents: Cents;
}

export interface OwnedContract {
  kind: "owned";
}

export type Contract = LoanContract | LeaseContract | OwnedContract;

export interface DrivingProfile {
  annualMiles: number;
  mix: DriveMix;
  horizon: KeepHorizon;
  priority: Priority;
  upcoming: Upcoming;
  comfortablePaymentCents: Cents;
  /** Cash the driver said they could put toward the car today. */
  availableCashCents: Cents;
}

export interface FuelPrices {
  regular: number;
  midgrade: number;
  premium: number;
  diesel: number;
  electric: number;
}

export interface Weights {
  payment: number;
  total: number;
  fuel: number;
  co2: number;
  fit: number;
}

export interface ValuationResult {
  ageYears: number;
  retention: number;
  mileageAdjustmentCents: Cents;
  baseValueCents: Cents;
  retailLowCents: Cents;
  retailHighCents: Cents;
  tradeInCents: Cents;
  conditionDeductionCents: Cents;
  modelled: true;
}

export interface CurvePoint {
  ageYears: number;
  valueCents: Cents;
  lowCents: Cents;
  highCents: Cents;
}

export interface AnnualEnergy {
  powertrain: Powertrain;
  blendedMpg: number;
  annualGallons: number;
  annualKwh: number;
  annualFuelCostCents: Cents;
  annualCo2Lbs: number;
  tailpipeOnly: boolean;
  electricityRateCentsPerKwh: number;
  phevElectricShare: number;
  pricePerGallon: number;
}

export interface NextStep {
  kind: NextStepKind;
  title: string;
  body: string;
  disclosure?: string;
}

export interface MoveDraft {
  id: MoveId;
  variant?: Exclude<UpgradeRole, "trade">;
  title: string;
  summary: string;
  monthlyPaymentCents: Cents;
  /** Monthly figure used in the score. Deferral uses this month's bill, which is zero. */
  scoreMonthlyCents: Cents;
  fiveYearNetCents: Cents;
  annualFuelCostCents: Cents;
  annualCo2Lbs: number;
  equityAppliedCents: Cents;
  endingValueCents: Cents;
  vehicleLabel?: string;
  replacement?: ReplacementVehicle;
  tailpipeOnly: boolean;
  ruledOutReason?: string;
}

export interface FactorContributions {
  payment: number;
  total: number;
  fuel: number;
  co2: number;
  fit: number;
  complexity: number;
}

export interface ScoredMove {
  id: MoveId;
  variant?: Exclude<UpgradeRole, "trade">;
  title: string;
  summary: string;
  monthlyPaymentCents: Cents;
  monthlyDeltaCents: Cents;
  fiveYearNetCents: Cents;
  fiveYearDeltaCents: Cents;
  annualFuelCostCents: Cents;
  annualFuelSavingsCents: Cents;
  annualCo2Lbs: number;
  annualCo2AvoidedLbs: number;
  equivalentMiles: number;
  equityAppliedCents: Cents;
  breakEvenMonths: number | null;
  vehicleLabel?: string;
  replacement?: ReplacementVehicle;
  tailpipeOnly: boolean;
  score: number;
  contributions: FactorContributions;
  next: NextStep;
}

export interface RuledOut {
  id: MoveId;
  variant?: Exclude<UpgradeRole, "trade">;
  title: string;
  reason: string;
}

export interface ComparisonRow {
  role: UpgradeRole;
  label: string;
  annualFuelCostCents: Cents;
  annualFuelSavingsCents: Cents;
  annualCo2Lbs: number;
  annualCo2AvoidedLbs: number;
  equivalentMiles: number;
  monthlyPaymentCents: Cents;
  monthlyDeltaCents: Cents;
  breakEvenMonths: number | null;
  tailpipeOnly: boolean;
  ruledOutReason?: string;
}

export interface Recommendation {
  valuation: ValuationResult;
  curve: CurvePoint[];
  equityCents: Cents;
  payoffCents: Cents;
  currentMonthlyCents: Cents;
  currentFuel: AnnualEnergy;
  ranked: ScoredMove[];
  ruledOut: RuledOut[];
  comparisons: ComparisonRow[];
  weights: Weights;
  headline: ScoredMove;
  alternatives: ScoredMove[];
  keep: ScoredMove;
  showKeep: boolean;
}

export interface AnalysisInput {
  asOf: string;
  modelYear: number;
  mileage: number;
  contract: Contract;
  driving: DrivingProfile;
  current: VehicleFacts;
  replacements: ReplacementVehicle[];
  fuelPrices: FuelPrices;
  packagesCents: Cents;
  electricityRateCentsPerKwh: number;
}
