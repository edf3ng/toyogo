import { COPY } from "@/config/copy";
import { FINANCE } from "@/config/finance";
import { VALUATION } from "@/config/valuation";
import { formatDollars } from "@/lib/format";
import {
  leaseMonthlyCents,
  monthlyPaymentCents,
  remainingBalanceCents,
} from "@/lib/engine/finance";
import { annualEnergy } from "@/lib/engine/fuel";
import { ownershipAgeYears, valueVehicle } from "@/lib/engine/valuation";
import type {
  AnalysisInput,
  AnnualEnergy,
  Cents,
  Contract,
  CurvePoint,
  MoveDraft,
  ReplacementVehicle,
  ValuationResult,
} from "@/types";

export interface MoveSet {
  ageYears: number;
  valuation: ValuationResult;
  curve: CurvePoint[];
  equityCents: Cents;
  payoffCents: Cents;
  currentMonthlyCents: Cents;
  currentFuel: AnnualEnergy;
  moves: MoveDraft[];
}

function remainingMonths(contract: Contract): number {
  if (contract.kind === "owned") return 0;
  return Math.max(0, contract.months - contract.monthsElapsed);
}

function payoffOf(contract: Contract): Cents {
  if (contract.kind === "owned") return 0;
  if (contract.kind === "lease") return contract.payoffCents;
  return remainingBalanceCents(
    contract.principalCents,
    contract.annualRate,
    contract.months,
    contract.monthsElapsed,
  );
}

function currentMonthly(contract: Contract): Cents {
  if (contract.kind === "owned") return 0;
  if (contract.kind === "lease") return leaseMonthlyCents(contract);
  return monthlyPaymentCents(contract.principalCents, contract.annualRate, contract.months);
}

function projectTradeIn(msrpCents: Cents, ageYears: number, miles: number): Cents {
  return valueVehicle(msrpCents, ageYears, miles).tradeInCents;
}

function fuelCash(energy: AnnualEnergy): Cents {
  return energy.annualFuelCostCents * (FINANCE.horizonMonths / 12);
}

export function buildMoves(input: AnalysisInput): MoveSet {
  const elapsed = input.contract.kind === "owned" ? null : input.contract.monthsElapsed;
  const ageYears = ownershipAgeYears(input.modelYear, input.asOf, elapsed);
  const valuation = valueVehicle(input.current.msrpCents, ageYears, input.mileage);
  const payoffCents = payoffOf(input.contract);
  const equityCents = valuation.tradeInCents - payoffCents;
  const monthly = currentMonthly(input.contract);
  const left = remainingMonths(input.contract);
  const rate = input.electricityRateCentsPerKwh;
  const currentFuel = annualEnergy({
    vehicle: input.current,
    annualMiles: input.driving.annualMiles,
    mix: input.driving.mix,
    fuelPrices: input.fuelPrices,
    electricityRateCentsPerKwh: rate,
  });
  const futureMiles = input.mileage + input.driving.annualMiles * (FINANCE.horizonMonths / 12);
  const keepEnding =
    input.contract.kind === "lease"
      ? 0
      : projectTradeIn(input.current.msrpCents, ageYears + 5, futureMiles);

  // A lease that ends inside the window gives the car back. The equity left
  // behind is part of the cost of doing nothing, and the fuel bill stays in
  // the comparison because the question is still "what does this driving cost".
  let keepCash = monthly * Math.min(left, FINANCE.horizonMonths) + fuelCash(currentFuel);
  if (input.contract.kind === "lease") {
    keepCash += FINANCE.dispositionFeeCents;
    if (equityCents > 0) keepCash += equityCents;
  }
  if (input.contract.kind === "owned") {
    keepCash = fuelCash(currentFuel);
  }

  const keep: MoveDraft = {
    id: "KEEP",
    title: "Keep your current plan",
    summary:
      input.contract.kind === "lease"
        ? "Let the lease run out and turn the car in. Equity above the payoff is not captured."
        : "Keep paying the current plan and keep driving this Toyota.",
    monthlyPaymentCents: monthly,
    scoreMonthlyCents: monthly,
    fiveYearNetCents: keepCash - keepEnding,
    annualFuelCostCents: currentFuel.annualFuelCostCents,
    annualCo2Lbs: currentFuel.annualCo2Lbs,
    equityAppliedCents: 0,
    endingValueCents: keepEnding,
    tailpipeOnly: currentFuel.tailpipeOnly,
  };

  const moves: MoveDraft[] = [keep];
  const canTransact = input.contract.kind === "owned" || equityCents > 0;

  if (input.contract.kind === "loan" && payoffCents > 0) {
    const ending = projectTradeIn(input.current.msrpCents, ageYears + 5, futureMiles);
    const reason =
      payoffCents > input.driving.availableCashCents
        ? `Paying it off takes ${formatDollars(payoffCents)}, more than the ${formatDollars(input.driving.availableCashCents)} you said you have.`
        : input.driving.upcoming === "income_change"
          ? "Paying the balance off needs a lump sum during an income change."
          : undefined;
    moves.push({
      id: "PAY_OFF_EARLY",
      title: "Pay the loan off early",
      summary: "Write a check for the remaining balance. The monthly payment stops.",
      monthlyPaymentCents: 0,
      scoreMonthlyCents: 0,
      fiveYearNetCents: payoffCents + fuelCash(currentFuel) - ending,
      annualFuelCostCents: currentFuel.annualFuelCostCents,
      annualCo2Lbs: currentFuel.annualCo2Lbs,
      equityAppliedCents: 0,
      endingValueCents: ending,
      tailpipeOnly: currentFuel.tailpipeOnly,
      ruledOutReason: reason,
    });
  }

  if (input.contract.kind === "loan" && left > 12 && payoffCents > 0) {
    const refiMonthly = monthlyPaymentCents(payoffCents, FINANCE.refinanceApr, left);
    const ending = projectTradeIn(input.current.msrpCents, ageYears + 5, futureMiles);
    const savings = monthly - refiMonthly;
    const reason =
      savings < FINANCE.refinanceMinSavingsCents
        ? `Refinancing at the example rate would not lower the payment by at least ${formatDollars(FINANCE.refinanceMinSavingsCents)}.`
        : undefined;
    moves.push({
      id: "REFINANCE",
      title: "Refinance the balance",
      summary: "Same remaining term, example refinance rate, same Toyota.",
      monthlyPaymentCents: refiMonthly,
      scoreMonthlyCents: refiMonthly,
      fiveYearNetCents:
        refiMonthly * Math.min(left, FINANCE.horizonMonths) + fuelCash(currentFuel) - ending,
      annualFuelCostCents: currentFuel.annualFuelCostCents,
      annualCo2Lbs: currentFuel.annualCo2Lbs,
      equityAppliedCents: 0,
      endingValueCents: ending,
      tailpipeOnly: currentFuel.tailpipeOnly,
      ruledOutReason: reason,
    });
  }

  if (
    (input.contract.kind === "loan" || input.contract.kind === "lease") &&
    input.driving.upcoming === "income_change"
  ) {
    const extra =
      input.contract.kind === "loan"
        ? Math.round((payoffCents * input.contract.annualRate) / 12)
        : Math.round(
            (input.contract.capCostCents + input.contract.residualCents) *
              input.contract.moneyFactor,
          );
    moves.push({
      id: "DEFER_PAYMENT",
      title: "Pause one payment",
      summary: "Skip the next payment. It moves to the end of the term and interest accrues.",
      monthlyPaymentCents: 0,
      scoreMonthlyCents: 0,
      fiveYearNetCents: keep.fiveYearNetCents + extra,
      annualFuelCostCents: currentFuel.annualFuelCostCents,
      annualCo2Lbs: currentFuel.annualCo2Lbs,
      equityAppliedCents: 0,
      endingValueCents: keepEnding,
      tailpipeOnly: currentFuel.tailpipeOnly,
    });
  }

  if (input.contract.kind === "lease" && left <= 6 && left > 0) {
    const buyoutMonthly = monthlyPaymentCents(
      payoffCents,
      FINANCE.exampleApr,
      FINANCE.exampleTermMonths,
    );
    const ending = projectTradeIn(input.current.msrpCents, ageYears + 5, futureMiles);
    const horizonReason =
      input.driving.horizon === "under_1"
        ? "A buyout keeps this car, and you said you plan to move on within a year."
        : undefined;
    moves.push({
      id: "LEASE_BUYOUT",
      title: "Buy out the lease",
      summary: "Finance the example payoff quote and keep this Toyota.",
      monthlyPaymentCents: buyoutMonthly,
      scoreMonthlyCents: buyoutMonthly,
      fiveYearNetCents: buyoutMonthly * Math.min(FINANCE.exampleTermMonths, FINANCE.horizonMonths) +
        fuelCash(currentFuel) -
        ending,
      annualFuelCostCents: currentFuel.annualFuelCostCents,
      annualCo2Lbs: currentFuel.annualCo2Lbs,
      equityAppliedCents: 0,
      endingValueCents: ending,
      tailpipeOnly: currentFuel.tailpipeOnly,
      ruledOutReason: horizonReason,
    });

    const returnReason =
      equityCents > VALUATION.equityForfeitFloorCents
        ? `Returning the car would give up about ${formatDollars(equityCents)} of equity.`
        : undefined;
    moves.push({
      id: "LEASE_RETURN",
      title: "Return the car at lease end",
      summary: "Turn the car in when the lease ends. A disposition fee is included as an example.",
      monthlyPaymentCents: 0,
      scoreMonthlyCents: 0,
      fiveYearNetCents: keep.fiveYearNetCents,
      annualFuelCostCents: currentFuel.annualFuelCostCents,
      annualCo2Lbs: currentFuel.annualCo2Lbs,
      equityAppliedCents: 0,
      endingValueCents: 0,
      tailpipeOnly: currentFuel.tailpipeOnly,
      ruledOutReason: returnReason,
    });
  }

  const trade = input.replacements.find((item) => item.role === "trade");
  if (trade) {
    moves.push(
      replacementMove(input, trade, equityCents, canTransact, currentFuel, "TRADE_UP"),
    );
  }

  for (const role of ["hybrid", "phev", "bev"] as const) {
    const found = input.replacements.find((item) => item.role === role);
    if (!found) continue;
    moves.push(replacementMove(input, found, equityCents, true, currentFuel, "HYBRID_UPGRADE"));
  }

  for (const move of moves) {
    if (move.id === "KEEP" || move.id === "DEFER_PAYMENT" || move.ruledOutReason) continue;
    if (move.monthlyPaymentCents > input.driving.comfortablePaymentCents) {
      move.ruledOutReason = `The payment is ${formatDollars(move.monthlyPaymentCents)} a month, above the ${formatDollars(input.driving.comfortablePaymentCents)} you said you can live with.`;
    }
  }

  const pace = ageYears > 0 ? input.mileage / ageYears : input.driving.annualMiles;
  const last = Math.ceil(ageYears) + 5;
  const curve: CurvePoint[] = [];
  for (let year = 0; year <= last; year += 1) {
    const point = valueVehicle(input.current.msrpCents, year, Math.round(pace * year));
    curve.push({
      ageYears: year,
      valueCents: point.baseValueCents,
      lowCents: point.retailLowCents,
      highCents: point.retailHighCents,
    });
  }

  return {
    ageYears,
    valuation,
    curve,
    equityCents,
    payoffCents,
    currentMonthlyCents: monthly,
    currentFuel,
    moves,
  };
}

function replacementMove(
  input: AnalysisInput,
  vehicle: ReplacementVehicle,
  equityCents: Cents,
  allow: boolean,
  currentFuel: AnnualEnergy,
  id: "TRADE_UP" | "HYBRID_UPGRADE",
): MoveDraft {
  const price = vehicle.msrpCents + input.packagesCents;
  const equityApplied = Math.max(0, equityCents);
  const principal = Math.max(0, price - equityCents);
  const monthly = monthlyPaymentCents(principal, FINANCE.exampleApr, FINANCE.exampleTermMonths);
  const energy = annualEnergy({
    vehicle,
    annualMiles: input.driving.annualMiles,
    mix: input.driving.mix,
    fuelPrices: input.fuelPrices,
    electricityRateCentsPerKwh: input.electricityRateCentsPerKwh,
  });
  const ending = projectTradeIn(
    price,
    5,
    input.driving.annualMiles * (FINANCE.horizonMonths / 12),
  );
  const label = vehicle.label;
  const variant = vehicle.role === "trade" ? undefined : vehicle.role;
  let ruledOutReason: string | undefined;
  if (id === "TRADE_UP" && !allow) {
    ruledOutReason =
      "Trading up needs positive equity, or a car you own outright. This one does not clear that bar.";
  }
  const title =
    id === "TRADE_UP"
      ? "Trade up and roll the equity forward"
      : vehicle.role === "phev"
        ? "Move to a plug-in hybrid"
        : vehicle.role === "bev"
          ? "Move to a battery-electric Toyota"
          : "Move to a hybrid";
  const equityLine =
    equityCents > 0
      ? `${formatDollars(equityApplied)} of equity is applied to the amount financed.`
      : "There is no positive equity to apply, so the example price is financed in full.";
  return {
    id,
    variant,
    title,
    summary: `${label}. Example price ${formatDollars(price)}. ${equityLine}`,
    monthlyPaymentCents: monthly,
    scoreMonthlyCents: monthly,
    fiveYearNetCents:
      monthly * Math.min(FINANCE.exampleTermMonths, FINANCE.horizonMonths) +
      energy.annualFuelCostCents * (FINANCE.horizonMonths / 12) -
      ending,
    annualFuelCostCents: energy.annualFuelCostCents,
    annualCo2Lbs: energy.annualCo2Lbs,
    equityAppliedCents: id === "TRADE_UP" && !allow ? 0 : equityApplied,
    endingValueCents: ending,
    vehicleLabel: label,
    replacement: vehicle,
    tailpipeOnly: energy.tailpipeOnly || vehicle.powertrain === "bev",
    ruledOutReason,
  };
}

export function repairNote(upcoming: AnalysisInput["driving"]["upcoming"]): string | undefined {
  return upcoming === "repair_needed" ? COPY.repairNote : undefined;
}
