import { FINANCE } from "@/config/finance";
import { FUEL } from "@/config/fuel";
import { VALUATION } from "@/config/valuation";
import { COMPLEXITY_PENALTY, WEIGHTS } from "@/config/weights";
import { formatDollars, formatPercent } from "@/lib/format";

export interface AssumptionRow {
  label: string;
  value: string;
  note: string;
}

export function assumptionRows(electricityCents: number = FUEL.electricityRateCentsPerKwh): AssumptionRow[] {
  return [
    {
      label: "Value left after year one",
      value: formatPercent(VALUATION.yearOneRetention),
      note: "Industry rule of thumb, not Toyota or EPA data.",
    },
    {
      label: "Value kept each year, years 2–5",
      value: formatPercent(VALUATION.yearsTwoToFive),
      note: "Applied to the value remaining after the previous year.",
    },
    {
      label: "Value kept each year after year 5",
      value: formatPercent(VALUATION.beyondFive),
      note: "Depreciation slows once the early drop is behind the car.",
    },
    {
      label: "Expected miles",
      value: `${VALUATION.expectedMilesPerYear.toLocaleString("en-US")} / year`,
      note: "Miles under this add value. Miles over it subtract value.",
    },
    {
      label: "Mileage adjustment",
      value: `${formatDollars(VALUATION.mileageRateCents)} / mile`,
      note: "Per mile away from the expected odometer.",
    },
    {
      label: "Retail range",
      value: `${VALUATION.retailLowFactor}× to ${VALUATION.retailHighFactor}×`,
      note: "The value on screen is a range around the modelled base, not a single price.",
    },
    {
      label: "Trade-in discount",
      value: formatPercent(VALUATION.tradeInDiscount),
      note: "Trade-in sits under the modelled base because a dealer offer is more conservative.",
    },
    {
      label: "Example loan for a next vehicle",
      value: `${formatPercent(FINANCE.exampleApr)} · ${FINANCE.exampleTermMonths} months`,
      note: "Example terms, not a Toyota Financial Services rate.",
    },
    {
      label: "Example refinance rate",
      value: formatPercent(FINANCE.refinanceApr),
      note: "Same remaining term. Set aside unless the payment drops by at least $15.",
    },
    {
      label: "Five-year window",
      value: `${FINANCE.horizonMonths / 12} years`,
      note: "Payments, fuel, and the car you would still hold are netted over this window.",
    },
    {
      label: "Lease turn-in fee",
      value: formatDollars(FINANCE.dispositionFeeCents),
      note: "Example fee, not a published Toyota Financial Services charge.",
    },
    {
      label: "Electricity",
      value: `${formatDollars(electricityCents)} / kWh`,
      note: "Assumption. Residential rates vary by state. Not the EPA gasoline price.",
    },
    {
      label: "Plug-in miles on a charge",
      value: formatPercent(FUEL.phevElectricShare),
      note: "Share of annual miles assumed to run on electricity. Not an EPA utility factor.",
    },
    {
      label: "City / highway mix",
      value: "75/25 · 55/45 · 25/75",
      note: "City, mixed, and highway. Mixed matches the EPA combined test split. Blended as a harmonic mean so the gallons are right.",
    },
    {
      label: "Score weights",
      value: "Set by what matters most",
      note: `Lowest payment ${WEIGHTS.lowest_payment.payment}/${WEIGHTS.lowest_payment.total}/${WEIGHTS.lowest_payment.fuel}/${WEIGHTS.lowest_payment.co2}/${WEIGHTS.lowest_payment.fit}. Complexity penalty ${COMPLEXITY_PENALTY}.`,
    },
  ];
}
