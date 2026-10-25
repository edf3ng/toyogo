import { CANDIDATES, candidatesFor, type CandidateVehicle } from "@/config/candidates";
import { ENERGY } from "@/config/energy";
import { FINANCING } from "@/config/financing";
import { weightsForRank, type PriorityKey } from "@/config/priorities";
import { leaseMonthlyCents, monthlyPaymentCents, remainingBalanceCents } from "@/lib/engine/finance";
import { priceDeal } from "@/lib/engine/deal";
import { energyCost, paybackMonths, type ChargeAccess } from "@/lib/engine/energy";
import { tailpipeLbs } from "@/lib/engine/emissions";
import {
  budgetGate,
  chargingGate,
  dailyGate,
  equityGate,
  limitingGate,
  overBudget,
  paybackGate,
  verdictFor,
  viabilityMultiplier,
  type Gates,
  type Verdict,
} from "@/lib/engine/viability";
import { ownershipAgeYears, valueVehicle } from "@/lib/engine/valuation";
import type { Cents, Contract, DriveMix, Powertrain, ValuationResult } from "@/types";

export interface CurrentVehicle {
  id: string;
  year: number;
  model: string;
  cityMpg: number;
  highwayMpg: number;
  co2TailpipeGpm: number;
  msrpCents: Cents;
  miles: number;
  seats?: number;
  cargoCuFt?: number;
  horsepower?: number;
}

export interface SwitchInput {
  asOf: string;
  current: CurrentVehicle;
  contract: Contract;
  dailyMiles: number;
  mix: DriveMix;
  chargeAccess: ChargeAccess;
  stationCount: number;
  budgetCents: Cents;
  cashDownCents: Cents;
  priorities: readonly PriorityKey[];
  gasDollarsPerGallon: number;
  electricityCentsPerKwh: number;
  issues?: readonly string[];
  /** Payment the driver typed. Used when it is present, instead of the amortised figure. */
  statedPaymentCents?: Cents;
  apr?: number;
  termMonths?: number;
  /** Override the class filter when a test wants the full lineup. */
  candidates?: CandidateVehicle[];
}

export interface RankedSwitch {
  id: string;
  label: string;
  powertrain: Powertrain;
  year: number;
  model: string;
  verdict: Verdict;
  /** Lowest applicable gate. Null when every gate is tied. */
  limiting: keyof Gates | null;
  gates: Gates;
  score: number;
  /** Each priority's weight times its normalized benefit, before the viability multiplier. */
  factors: Record<PriorityKey, number>;
  removed: boolean;
  removeReason?: string;
  paymentCents: Cents;
  paymentDeltaCents: Cents;
  equityCents: Cents;
  negativeEquity: boolean;
  taxCents: Cents;
  amountFinancedCents: Cents;
  annualEnergyCents: Cents;
  monthlyEnergySavingCents: Cents;
  paybackMonths: number;
  electricShare: number;
  electricRangeMiles: number;
  annualCo2Lbs: number;
  co2AvoidedLbs: number;
  fiveYearCents: Cents;
  fiveYearDeltaCents: Cents;
}

export interface SwitchResult {
  valuation: ValuationResult;
  payoffCents: Cents;
  equityCents: Cents;
  negativeEquity: boolean;
  currentPaymentCents: Cents;
  winner: RankedSwitch;
  /** Next two scored options, with the current car left out. */
  runners: RankedSwitch[];
  keep: RankedSwitch;
  aboveBudget: RankedSwitch[];
  ranked: RankedSwitch[];
  weights: Record<PriorityKey, number>;
  assumptions: {
    drivingDays: number;
    gasDollarsPerGallon: number;
    electricityCentsPerKwh: number;
    taxRate: number;
    apr: number;
    termMonths: number;
    salesTaxVariesByState: true;
    electricityIsStateAverage: true;
    valuationIsModelled: true;
  };
}

function payoffCents(contract: Contract): Cents {
  if (contract.kind === "loan") {
    return remainingBalanceCents(
      contract.principalCents,
      contract.annualRate,
      contract.months,
      contract.monthsElapsed,
    );
  }
  if (contract.kind === "lease") return contract.payoffCents;
  return 0;
}

function currentPaymentCents(contract: Contract): Cents {
  if (contract.kind === "loan") {
    return monthlyPaymentCents(contract.principalCents, contract.annualRate, contract.months);
  }
  if (contract.kind === "lease") return leaseMonthlyCents(contract);
  return 0;
}

function blankFactors(): Record<PriorityKey, number> {
  return { payment: 0, total: 0, fuel: 0, co2: 0, practical: 0, performance: 0 };
}

function monthsRemaining(contract: Contract): number {
  if (contract.kind === "owned") return 0;
  return Math.max(0, contract.months - contract.monthsElapsed);
}

function norm(values: number[], index: number): number {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (max === min) return 1;
  return (values[index] - min) / (max - min);
}

interface Draft {
  option: RankedSwitch;
  benefits: Record<PriorityKey, number>;
}

export function recommendSwitch(input: SwitchInput): SwitchResult {
  const apr = input.apr ?? FINANCING.exampleApr;
  const termMonths = input.termMonths ?? FINANCING.exampleTermMonths;
  const ageYears = ownershipAgeYears(input.current.year, input.asOf, null);
  const valuation = valueVehicle(
    input.current.msrpCents,
    ageYears,
    input.current.miles,
    input.issues ?? [],
  );
  const payoff = payoffCents(input.contract);
  const paymentNow =
    input.statedPaymentCents && input.statedPaymentCents > 0
      ? Math.round(input.statedPaymentCents)
      : currentPaymentCents(input.contract);
  const equity = valuation.tradeInCents - payoff;
  const weights = weightsForRank(input.priorities);
  const lineup = input.candidates ?? candidatesFor(input.current.model);

  const keepEnergy = energyCost({
    vehicle: {
      powertrain: "gas",
      cityMpg: input.current.cityMpg,
      highwayMpg: input.current.highwayMpg,
      kwhPer100: 0,
      electricRangeMiles: 0,
    },
    dailyMiles: input.dailyMiles,
    mix: input.mix,
    chargeAccess: input.chargeAccess,
    gasDollarsPerGallon: input.gasDollarsPerGallon,
    electricityCentsPerKwh: input.electricityCentsPerKwh,
  });
  const keepCo2 = tailpipeLbs({
    powertrain: "gas",
    annualMiles: keepEnergy.annualMiles,
    gasMiles: keepEnergy.gasMiles,
    gramsPerMile: input.current.co2TailpipeGpm,
  });
  const keepFive =
    paymentNow * Math.min(60, monthsRemaining(input.contract)) + keepEnergy.annualCostCents * 5;

  const keep: RankedSwitch = {
    id: "keep",
    label: `Keep the ${input.current.year} ${input.current.model}`,
    powertrain: "gas",
    year: input.current.year,
    model: input.current.model,
    verdict: "viable",
    limiting: null,
    gates: { charging: null, daily: null, budget: 1, equity: 1, payback: 1 },
    score: 0,
    factors: blankFactors(),
    removed: false,
    paymentCents: paymentNow,
    paymentDeltaCents: 0,
    equityCents: equity,
    negativeEquity: equity < 0,
    taxCents: 0,
    amountFinancedCents: 0,
    annualEnergyCents: keepEnergy.annualCostCents,
    monthlyEnergySavingCents: 0,
    paybackMonths: 0,
    electricShare: 0,
    electricRangeMiles: 0,
    annualCo2Lbs: keepCo2,
    co2AvoidedLbs: 0,
    fiveYearCents: keepFive,
    fiveYearDeltaCents: 0,
  };

  const drafts: Draft[] = [
    {
      option: keep,
      benefits: {
        payment: 0,
        total: 0,
        fuel: 0,
        co2: 0,
        practical: (input.current.seats ?? 5) * 10 + (input.current.cargoCuFt ?? 15),
        performance: input.current.horsepower ?? 150,
      },
    },
  ];

  for (const car of lineup) {
    drafts.push(scoreCandidate(input, car, valuation.tradeInCents, payoff, paymentNow, keepEnergy.annualCostCents, keepCo2, keepFive, apr, termMonths));
  }

  const scoring = drafts.filter((draft) => !draft.option.removed);
  const keys: PriorityKey[] = ["payment", "total", "fuel", "co2", "practical", "performance"];
  scoring.forEach((draft, index) => {
    const factors = blankFactors();
    let weighted = 0;
    for (const key of keys) {
      const column = scoring.map((item) => item.benefits[key]);
      const share = (weights[key] ?? 0) * norm(column, index);
      factors[key] = share;
      weighted += share;
    }
    draft.option.factors = factors;
    draft.option.score = weighted * viabilityMultiplier(draft.option.verdict);
  });

  const ranked = drafts
    .map((draft) => draft.option)
    .filter((option) => option.id !== "keep" && !option.removed)
    .sort((a, b) => b.score - a.score);
  const aboveBudget = drafts
    .map((draft) => draft.option)
    .filter((option) => option.removed);
  const winner = ranked[0] ?? keep;

  return {
    valuation,
    payoffCents: payoff,
    equityCents: equity,
    negativeEquity: equity < 0,
    currentPaymentCents: paymentNow,
    winner,
    runners: ranked.slice(1, 3),
    keep,
    aboveBudget,
    ranked,
    weights,
    assumptions: {
      drivingDays: ENERGY.drivingDaysPerYear,
      gasDollarsPerGallon: input.gasDollarsPerGallon,
      electricityCentsPerKwh: input.electricityCentsPerKwh,
      taxRate: FINANCING.salesTaxRate,
      apr,
      termMonths,
      salesTaxVariesByState: true,
      electricityIsStateAverage: true,
      valuationIsModelled: true,
    },
  };
}

function scoreCandidate(
  input: SwitchInput,
  car: CandidateVehicle,
  tradeInCents: Cents,
  payoff: Cents,
  paymentNow: Cents,
  keepEnergyCents: Cents,
  keepCo2: number,
  keepFive: Cents,
  apr: number,
  termMonths: number,
): Draft {
  const deal = priceDeal({
    priceCents: car.msrpCents,
    tradeInCents,
    payoffCents: payoff,
    cashDownCents: input.cashDownCents,
    apr,
    termMonths,
    currentPaymentCents: paymentNow,
  });
  const energy = energyCost({
    vehicle: {
      powertrain: car.powertrain,
      cityMpg: car.cityMpg,
      highwayMpg: car.highwayMpg,
      kwhPer100: car.kwhPer100,
      electricRangeMiles: car.electricRangeMiles,
    },
    dailyMiles: input.dailyMiles,
    mix: input.mix,
    chargeAccess: input.chargeAccess,
    gasDollarsPerGallon: input.gasDollarsPerGallon,
    electricityCentsPerKwh: input.electricityCentsPerKwh,
  });
  const annualCo2Lbs = tailpipeLbs({
    powertrain: car.powertrain,
    annualMiles: energy.annualMiles,
    gasMiles: energy.gasMiles,
    gramsPerMile: car.co2TailpipeGpm,
  });
  const monthlyEnergySavingCents = Math.round((keepEnergyCents - energy.annualCostCents) / 12);
  const payback = paybackMonths(deal.paymentDeltaCents, monthlyEnergySavingCents);
  const fiveYearCents = deal.paymentCents * Math.min(60, termMonths) + energy.annualCostCents * 5;
  const gates: Gates = {
    charging: chargingGate(car.powertrain, input.chargeAccess, input.stationCount),
    daily: dailyGate(car.powertrain, input.dailyMiles, car.electricRangeMiles, car.rangeMiles),
    budget: budgetGate(deal.paymentCents, input.budgetCents),
    equity: equityGate(deal.equityCents, car.msrpCents),
    payback: paybackGate(payback),
  };
  const rangeShort =
    car.powertrain === "phev" && car.electricRangeMiles < input.dailyMiles;
  const removed = overBudget(deal.paymentCents, input.budgetCents);
  const option: RankedSwitch = {
    id: car.id,
    label: car.label,
    powertrain: car.powertrain,
    year: car.year,
    model: car.model,
    verdict: verdictFor(gates, rangeShort),
    limiting: limitingGate(gates),
    gates,
    score: 0,
    factors: blankFactors(),
    removed,
    removeReason: removed ? "Payment is more than 25% above the stated budget." : undefined,
    paymentCents: deal.paymentCents,
    paymentDeltaCents: deal.paymentDeltaCents,
    equityCents: deal.equityCents,
    negativeEquity: deal.negativeEquity,
    taxCents: deal.taxCents,
    amountFinancedCents: deal.amountFinancedCents,
    annualEnergyCents: energy.annualCostCents,
    monthlyEnergySavingCents,
    paybackMonths: payback,
    electricShare: energy.electricShare,
    electricRangeMiles: car.powertrain === "bev" ? car.rangeMiles : car.electricRangeMiles,
    annualCo2Lbs,
    co2AvoidedLbs: keepCo2 - annualCo2Lbs,
    fiveYearCents,
    fiveYearDeltaCents: fiveYearCents - keepFive,
  };
  return {
    option,
    benefits: {
      payment: -deal.paymentDeltaCents,
      total: keepFive - fiveYearCents,
      fuel: keepEnergyCents - energy.annualCostCents,
      co2: keepCo2 - annualCo2Lbs,
      practical: car.seats * 10 + car.cargoCuFt,
      performance: car.horsepower,
    },
  };
}

/** Figures for one priced vehicle, including cars outside this driver's class filter. */
export function lookupOption(input: SwitchInput, id: string): { option: RankedSwitch; keep: RankedSwitch } | undefined {
  const result = recommendSwitch({ ...input, candidates: CANDIDATES });
  const option = [...result.ranked, ...result.aboveBudget].find((item) => item.id === id);
  return option ? { option, keep: result.keep } : undefined;
}

export { CANDIDATES };
