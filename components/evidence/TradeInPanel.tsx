"use client";

import { CONDITION_CENTS } from "@/config/valuation";
import { formatDollars } from "@/lib/format";
import { recommendSwitch } from "@/lib/engine/switch";
import type { SavedTrip } from "@/lib/trip";

const ISSUE_LABEL: Record<string, string> = {
  accident: "Accident history",
  tires: "Tires",
  brakes: "Brakes",
  warning: "Warning light",
};

export function TradeInPanel({ trip }: { trip: SavedTrip }) {
  const result = recommendSwitch(trip.input);
  const car = trip.input.current;
  const issues = trip.input.issues ?? [];

  return (
    <div>
      <p className="text-sm text-muted">
        {car.year} {car.model} · {car.miles.toLocaleString("en-US")} miles
        {trip.acquired ? ` · acquired ${trip.acquired === "cpo" ? "certified pre-owned" : trip.acquired}` : ""}
        {trip.purchasedOn ? ` · ${trip.purchasedOn}` : ""}
      </p>
      <p className="mt-4 text-sm text-muted">Estimated trade-in</p>
      <p className="text-4xl font-semibold tracking-tight">{formatDollars(result.valuation.tradeInCents)}</p>
      <p className="mt-2 text-sm">
        Modelled range {formatDollars(result.valuation.retailLowCents)} to{" "}
        {formatDollars(result.valuation.retailHighCents)}. This is the depreciation curve, not a live listing sample.
      </p>
      {issues.length > 0 ? (
        <ul className="mt-4 text-sm">
          {issues.map((issue) => (
            <li key={issue}>
              {ISSUE_LABEL[issue] ?? issue}: −{formatDollars(CONDITION_CENTS[issue as keyof typeof CONDITION_CENTS] ?? 0)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No condition notes were checked.</p>
      )}
      {trip.agreementName ? (
        <p className="mt-3 text-sm">
          Agreement on this browser only: {trip.agreementName}. The numbers above use what you typed.
        </p>
      ) : null}
      <div className="mt-6 border-t border-line pt-4 text-sm">
        <p>Still to pay: {formatDollars(result.payoffCents)}</p>
        <p className="mt-1">
          {result.negativeEquity
            ? `Underwater by ${formatDollars(Math.abs(result.equityCents))}.`
            : `Equity: ${formatDollars(result.equityCents)}.`}
        </p>
      </div>
      <h2 className="mt-6 text-lg font-semibold">Electrified options</h2>
      <ul className="mt-3 grid gap-3">
        {[result.winner, ...result.runners].map((option) => (
          <li key={option.id} className="border border-line bg-white p-3 text-sm">
            <p className="font-medium">{option.label}</p>
            <p className="mt-1 text-muted">
              Example payment {formatDollars(option.paymentCents)}/mo. Amount financed{" "}
              {formatDollars(option.amountFinancedCents)}, including example tax.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
