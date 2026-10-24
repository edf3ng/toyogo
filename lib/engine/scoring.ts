import { COMPLEXITY, COMPLEXITY_PENALTY, HORIZON_FIT, WEIGHTS } from "@/config/weights";
import { breakEvenMonths, equivalentMiles } from "@/lib/engine/fuel";
import { routeNext } from "@/lib/engine/routing";
import type {
  Cents,
  DrivingProfile,
  FactorContributions,
  MoveDraft,
  ScoredMove,
} from "@/types";

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 1);
  return values.map((value) => (value - min) / (max - min));
}

export function scoreMoves(input: {
  moves: MoveDraft[];
  keep: MoveDraft;
  driving: DrivingProfile;
  payoffCents: Cents;
  currentGramsPerMile: number;
}): ScoredMove[] {
  const { moves, keep, driving, payoffCents, currentGramsPerMile } = input;
  const weights = WEIGHTS[driving.priority];
  const paymentBenefit = moves.map(
    (move) => keep.scoreMonthlyCents - move.scoreMonthlyCents,
  );
  const totalBenefit = moves.map(
    (move) => keep.fiveYearNetCents - move.fiveYearNetCents,
  );
  const fuelBenefit = moves.map(
    (move) => keep.annualFuelCostCents - move.annualFuelCostCents,
  );
  const co2Benefit = moves.map((move) => keep.annualCo2Lbs - move.annualCo2Lbs);
  const paymentNorm = normalize(paymentBenefit);
  const totalNorm = normalize(totalBenefit);
  const fuelNorm = normalize(fuelBenefit);
  const co2Norm = normalize(co2Benefit);

  const scored = moves.map((move, index): ScoredMove => {
    const fit = HORIZON_FIT[driving.horizon][move.id];
    const complexity = COMPLEXITY[move.id];
    const contributions: FactorContributions = {
      payment: weights.payment * paymentNorm[index],
      total: weights.total * totalNorm[index],
      fuel: weights.fuel * fuelNorm[index],
      co2: weights.co2 * co2Norm[index],
      fit: weights.fit * fit,
      complexity: -COMPLEXITY_PENALTY * complexity,
    };
    const score =
      contributions.payment +
      contributions.total +
      contributions.fuel +
      contributions.co2 +
      contributions.fit +
      contributions.complexity;
    const annualFuelSavingsCents = keep.annualFuelCostCents - move.annualFuelCostCents;
    const annualCo2AvoidedLbs = keep.annualCo2Lbs - move.annualCo2Lbs;
    const monthlyDeltaCents = move.monthlyPaymentCents - keep.monthlyPaymentCents;
    return {
      id: move.id,
      variant: move.variant,
      title: move.title,
      summary: move.summary,
      monthlyPaymentCents: move.monthlyPaymentCents,
      monthlyDeltaCents,
      fiveYearNetCents: move.fiveYearNetCents,
      fiveYearDeltaCents: move.fiveYearNetCents - keep.fiveYearNetCents,
      annualFuelCostCents: move.annualFuelCostCents,
      annualFuelSavingsCents,
      annualCo2Lbs: move.annualCo2Lbs,
      annualCo2AvoidedLbs,
      equivalentMiles: equivalentMiles(annualCo2AvoidedLbs, currentGramsPerMile),
      equityAppliedCents: move.equityAppliedCents,
      breakEvenMonths: breakEvenMonths(monthlyDeltaCents, annualFuelSavingsCents),
      vehicleLabel: move.vehicleLabel,
      replacement: move.replacement,
      tailpipeOnly: move.tailpipeOnly,
      score,
      contributions,
      next: routeNext({
        moveId: move.id,
        driving,
        payoffCents,
        vehicleLabel: move.vehicleLabel,
      }),
    };
  });

  return scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
