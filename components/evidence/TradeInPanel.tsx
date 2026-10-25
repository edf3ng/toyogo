"use client";

import { CONDITION_CENTS } from "@/config/valuation";
import { formatDollars } from "@/lib/format";
import { recommendSwitch } from "@/lib/engine/switch";
import { MarketValue } from "@/components/evidence/MarketValue";
import type { SavedTrip } from "@/lib/trip";

const ISSUE_LABEL: Record<string, string> = {
  accident: "Accident history",
  tires: "Tires",
  brakes: "Brakes",
  warning: "Warning light",
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-line bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function TradeInPanel({ trip }: { trip: SavedTrip }) {
  const result = recommendSwitch(trip.input);
  const car = trip.input.current;
  const issues = trip.input.issues ?? [];
  const acquired =
    trip.acquired === "cpo" ? "certified pre-owned" : trip.acquired === "used" ? "used" : trip.acquired === "new" ? "new" : null;

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">
        {car.year} {car.model}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {car.miles.toLocaleString("en-US")} miles
        {acquired ? ` · ${acquired}` : ""}
        {trip.purchasedOn ? ` · ${trip.purchasedOn}` : ""}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Trade-in" value={formatDollars(result.valuation.tradeInCents)} note="Modelled" />
        <Stat label="Still to pay" value={formatDollars(result.payoffCents)} />
        <Stat
          label={result.negativeEquity ? "Underwater" : "Equity"}
          value={formatDollars(Math.abs(result.equityCents))}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        Modelled retail {formatDollars(result.valuation.retailLowCents)}–{formatDollars(result.valuation.retailHighCents)}.
      </p>
      {issues.length > 0 ? (
        <ul className="mt-3 text-sm">
          {issues.map((issue) => (
            <li key={issue}>
              {ISSUE_LABEL[issue] ?? issue}: −{formatDollars(CONDITION_CENTS[issue as keyof typeof CONDITION_CENTS] ?? 0)}
            </li>
          ))}
        </ul>
      ) : null}
      <MarketValue year={car.year} model={car.model} miles={car.miles} issues={issues} />
      {trip.agreementName ? (
        <p className="mt-3 text-sm text-muted">Agreement on this browser: {trip.agreementName}.</p>
      ) : null}
    </div>
  );
}
