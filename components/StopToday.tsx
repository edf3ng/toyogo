"use client";

import dynamic from "next/dynamic";
import { COPY } from "@/config/copy";
import { PAINTS } from "@/config/vehicles";
import { Assumptions } from "@/components/Assumptions";
import type { JourneyState } from "@/components/journey-state";
import { VehicleSilhouette } from "@/components/VehicleSilhouette";
import { ValueChart } from "@/components/ValueChart";
import { formatDollars, formatNumber, formatPounds } from "@/lib/format";
import type { Recommendation } from "@/types";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), {
  ssr: false,
  loading: () => <VehicleSilhouette />,
});

export function StopToday({
  state,
  result,
  onPaint,
  onBack,
  onContinue,
}: {
  state: JourneyState;
  result: Recommendation;
  onPaint: (paintId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const paint = PAINTS.find((item) => item.id === state.paintId) ?? PAINTS[0];
  const fuel = result.currentFuel;
  const equityClass = result.equityCents >= 0 ? "text-jade-800" : "text-ink";

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Your Toyota today</h1>
      <p className="mt-2 text-sm text-muted">
        {state.vehicle?.year} {state.vehicle?.model}. {state.vehicle?.trim}.
      </p>

      <div className="mt-5">
        <VehicleViewer paint={paint.hex} />
        <p className="mt-2 text-sm text-muted">{COPY.stylisedVehicle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAINTS.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.name}
              title={swatch.name}
              onClick={() => onPaint(swatch.id)}
              className={`h-7 w-7 border ${
                swatch.id === paint.id ? "border-jade-800" : "border-line"
              }`}
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
        </div>
        <p className="mt-1 text-sm text-muted">{paint.name}. Paint only — not the interface color.</p>
      </div>

      <div className="mt-8 border-t border-line pt-5">
        <h2 className="text-lg font-semibold tracking-tight">What it’s worth</h2>
        <p className="mt-1 text-sm text-muted">{COPY.modelledValue}</p>
        <ValueChart points={result.curve} ageYears={result.valuation.ageYears} />
        <p className="text-sm text-muted">Dashed line: this car’s age on the curve.</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <Figure
            label="Retail range"
            value={`${formatDollars(result.valuation.retailLowCents)}–${formatDollars(result.valuation.retailHighCents)}`}
          />
          <Figure label="Trade-in" value={formatDollars(result.valuation.tradeInCents)} />
          <Figure
            label="Equity"
            value={formatDollars(result.equityCents)}
            className={equityClass}
          />
        </dl>
        <details className="mt-3">
          <summary className="text-sm font-medium">Why these numbers</summary>
          <p className="mt-2 text-sm text-muted">
            Equity is the trade-in minus the payoff of {formatDollars(result.payoffCents)}. The
            mileage adjustment is {formatDollars(result.valuation.mileageAdjustmentCents)}. Age{" "}
            {formatNumber(result.valuation.ageYears, 1)} years, retention{" "}
            {formatNumber(result.valuation.retention * 100, 0)}%.
          </p>
        </details>
      </div>

      <div className="mt-8 border-t border-line pt-5">
        <h2 className="text-lg font-semibold tracking-tight">What it costs to drive</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <Figure
            label={fuel.powertrain === "bev" ? "Electricity / year" : "Fuel / year"}
            value={formatDollars(fuel.annualFuelCostCents)}
          />
          <Figure
            label={fuel.powertrain === "bev" ? "kWh / year" : "Gallons / year"}
            value={formatNumber(
              fuel.powertrain === "bev" ? fuel.annualKwh : fuel.annualGallons,
              0,
            )}
          />
          <Figure label="Tailpipe CO2 / year" value={formatPounds(fuel.annualCo2Lbs)} />
        </dl>
        <p className="mt-3 text-sm text-muted">
          {fuel.powertrain === "bev"
            ? COPY.tailpipe
            : fuel.powertrain === "phev"
              ? COPY.phevShare
              : `Gas price used: $${fuel.pricePerGallon.toFixed(2)} a gallon, from FuelEconomy.gov.`}
          {fuel.powertrain !== "gas" ? ` ${COPY.electricity}` : ""}
        </p>
      </div>

      <Assumptions electricityCents={state.electricityRateCentsPerKwh} />

      <div className="mt-6 flex gap-3">
        <button type="button" className="h-11 rounded-md border border-line px-4 text-sm" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
          onClick={onContinue}
        >
          See the next move
        </button>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  className = "text-ink",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-xl font-semibold tracking-tight tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}
