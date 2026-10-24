export interface ExplainFacts {
  title: string;
  monthly: string;
  monthlyDelta: string;
  deltaDirection: "lower" | "higher" | "same";
  fuelSavings: string;
  co2Avoided: string;
  equity: string;
  breakEven: string | null;
  nextTitle: string;
  tailpipeNote: string | null;
}

/** Template used whenever the language model is missing, slow, or wrong. */
export function explainTemplate(facts: ExplainFacts): string {
  const payment =
    facts.deltaDirection === "same"
      ? `The monthly figure is ${facts.monthly}, the same as the current plan.`
      : `The monthly figure is ${facts.monthly}, which is ${facts.monthlyDelta} ${facts.deltaDirection} than the current plan.`;
  const fuel = `Fuel changes by ${facts.fuelSavings} a year, and tailpipe CO2 changes by ${facts.co2Avoided} a year.`;
  const equity =
    facts.equity === "$0"
      ? "No equity is applied in this move."
      : `${facts.equity} of equity is applied.`;
  const even =
    facts.breakEven === null
      ? "There is no fuel-savings break-even on this move."
      : facts.breakEven === "0"
        ? "Fuel savings show up immediately, so the break-even is immediate."
        : `Fuel savings offset the monthly difference in ${facts.breakEven} months.`;
  const tailpipe = facts.tailpipeNote ? ` ${facts.tailpipeNote}` : "";
  return `${facts.title} is the strongest move on these weights. ${payment} ${fuel} ${equity} ${even}${tailpipe} Next step: ${facts.nextTitle}.`;
}
