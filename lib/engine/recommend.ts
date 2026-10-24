import { WEIGHTS } from "@/config/weights";
import { breakEvenMonths, equivalentMiles } from "@/lib/engine/fuel";
import { buildMoves } from "@/lib/engine/moves";
import { scoreMoves } from "@/lib/engine/scoring";
import type {
  AnalysisInput,
  ComparisonRow,
  MoveDraft,
  Recommendation,
  RuledOut,
} from "@/types";

function comparisonFrom(move: MoveDraft, keep: MoveDraft, gramsPerMile: number): ComparisonRow {
  const annualFuelSavingsCents = keep.annualFuelCostCents - move.annualFuelCostCents;
  const annualCo2AvoidedLbs = keep.annualCo2Lbs - move.annualCo2Lbs;
  const monthlyDeltaCents = move.monthlyPaymentCents - keep.monthlyPaymentCents;
  return {
    role: move.replacement?.role ?? "trade",
    label: move.vehicleLabel ?? move.title,
    annualFuelCostCents: move.annualFuelCostCents,
    annualFuelSavingsCents,
    annualCo2Lbs: move.annualCo2Lbs,
    annualCo2AvoidedLbs,
    equivalentMiles: equivalentMiles(annualCo2AvoidedLbs, gramsPerMile),
    monthlyPaymentCents: move.monthlyPaymentCents,
    monthlyDeltaCents,
    breakEvenMonths: breakEvenMonths(monthlyDeltaCents, annualFuelSavingsCents),
    tailpipeOnly: move.tailpipeOnly,
    ruledOutReason: move.ruledOutReason,
  };
}

export function recommend(input: AnalysisInput): Recommendation {
  const built = buildMoves(input);
  const keepDraft = built.moves.find((move) => move.id === "KEEP");
  if (!keepDraft) {
    throw new Error("Every recommendation includes a keep-the-plan baseline.");
  }
  const eligible = built.moves.filter((move) => !move.ruledOutReason);
  const ranked = scoreMoves({
    moves: eligible,
    keep: keepDraft,
    driving: input.driving,
    payoffCents: built.payoffCents,
    currentGramsPerMile: input.current.co2TailpipeGpm,
  });
  const headline = ranked[0];
  const keep = ranked.find((move) => move.id === "KEEP") ?? headline;
  const alternatives = ranked
    .filter((move) => move !== headline && move.id !== "KEEP")
    .slice(0, 2);
  const ruledOut: RuledOut[] = built.moves
    .filter((move) => move.ruledOutReason)
    .map((move) => ({
      id: move.id,
      variant: move.variant,
      title: move.title,
      reason: move.ruledOutReason ?? "",
    }));
  const comparisons = built.moves
    .filter((move) => move.replacement)
    .map((move) => comparisonFrom(move, keepDraft, input.current.co2TailpipeGpm));

  return {
    valuation: built.valuation,
    curve: built.curve,
    equityCents: built.equityCents,
    payoffCents: built.payoffCents,
    currentMonthlyCents: built.currentMonthlyCents,
    currentFuel: built.currentFuel,
    ranked,
    ruledOut,
    comparisons,
    weights: WEIGHTS[input.driving.priority],
    headline,
    alternatives,
    keep,
    showKeep: headline.id !== "KEEP",
  };
}
