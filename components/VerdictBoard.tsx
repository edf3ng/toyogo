"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FINANCING } from "@/config/financing";
import { COPY } from "@/config/copy";
import { DRIVERS } from "@/data/drivers";
import { formatDollars, formatPercent } from "@/lib/format";
import { recommendSwitch, type RankedSwitch, type SwitchResult } from "@/lib/engine/switch";
import type { Verdict } from "@/lib/engine/viability";
import { readTrip, tripFromDriver, writeTrip, type SavedTrip } from "@/lib/trip";

const VERDICT_LABEL: Record<Verdict, string> = {
  viable: "Viable",
  caveats: "Viable with caveats",
  not_yet: "Not yet",
};

const POWERTRAIN_LABEL: Record<RankedSwitch["powertrain"], string> = {
  gas: "Keep the gasoline car",
  hybrid: "Standard hybrid",
  phev: "Plug-in hybrid",
  bev: "Battery EV",
};

function paybackLabel(months: number): string {
  if (!Number.isFinite(months)) return "Fuel savings alone don't cover the payment increase";
  if (months <= 0) return "The payment is not higher than today";
  return `${Math.round(months)} months`;
}

function limitingSentence(option: RankedSwitch): string {
  switch (option.limiting) {
    case "charging":
      return "Charging is the limit. A plug needs a home charger or stations nearby.";
    case "daily":
      return "The daily drive is the limit. Electric range does not cover the whole day.";
    case "budget":
      return "The payment is the limit. It sits above the budget you entered.";
    case "equity":
      return "Equity is the limit. The trade is underwater.";
    case "payback":
      return "Payback is the limit. Fuel savings alone don't cover the payment increase.";
    default:
      return "Every gate that applies is in good shape.";
  }
}

function hero(option: RankedSwitch): { value: string; caption: string } {
  if (option.powertrain === "phev") {
    return {
      value: `${Math.round(option.electricShare * 100)}%`,
      caption: "of these miles can run on a charge. The rest stay on petrol.",
    };
  }
  const annual = option.monthlyEnergySavingCents * 12;
  if (option.powertrain === "hybrid") {
    return {
      value: formatDollars(annual),
      caption: "a year in fuel. A standard hybrid does not plug in.",
    };
  }
  return {
    value: formatDollars(annual),
    caption: "a year in energy cost compared with keeping this car. Tailpipe CO2 on the EV is 0.",
  };
}

export function VerdictBoard() {
  const [trip, setTrip] = useState<SavedTrip | null>(null);

  useEffect(() => {
    const saved = readTrip() ?? tripFromDriver("alex");
    setTrip(saved);
  }, []);

  if (!trip) return <p className="text-sm text-muted">Loading the verdict.</p>;

  const result = recommendSwitch(trip.input);
  const winner = result.winner;

  function choose(id: "alex" | "blair" | "casey") {
    const next = tripFromDriver(id);
    writeTrip(next);
    setTrip(next);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-wrap gap-2" aria-label="Demo drivers">
        {DRIVERS.map((driver) => (
          <button
            key={driver.id}
            type="button"
            onClick={() => choose(driver.id)}
            className={`h-9 rounded-md border px-3 text-sm ${
              trip.source === driver.id ? "border-jade-800 text-jade-800" : "border-line"
            }`}
          >
            {driver.name}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        {trip.name} · {trip.place} · {trip.input.dailyMiles} miles a day ·{" "}
        {trip.input.chargeAccess === "yes" ? "can charge at home" : "no home charging"}
      </p>
      <p className="mt-6 text-sm font-medium text-jade-800">{VERDICT_LABEL[winner.verdict]}</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {POWERTRAIN_LABEL[winner.powertrain]}
        {winner.id !== "keep" ? ` · ${winner.label}` : ""}
      </h1>
      <p className="mt-2 text-4xl font-semibold tracking-tight">{hero(winner).value}</p>
      <p className="mt-1 text-sm text-muted">{hero(winner).caption}</p>
      <p className="mt-3 text-sm">{limitingSentence(winner)}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-sm">
        <div>
          <dt className="text-muted">Example payment</dt>
          <dd className="font-medium">{formatDollars(winner.paymentCents)}/mo</dd>
        </div>
        <div>
          <dt className="text-muted">Fuel saved each year</dt>
          <dd className="font-medium">{formatDollars(winner.monthlyEnergySavingCents * 12)}</dd>
        </div>
        <div>
          <dt className="text-muted">Payback</dt>
          <dd className="font-medium">{paybackLabel(winner.paybackMonths)}</dd>
        </div>
      </dl>

      {winner.negativeEquity ? (
        <p className="mt-4 text-sm">
          The trade is underwater by {formatDollars(Math.abs(winner.equityCents))}. That shortfall
          is financed with the next car, and it is not hidden in the payment.
        </p>
      ) : null}

      {trip.other ? (
        <p className="mt-4 text-sm">
          You also wrote: “{trip.other}”. That note is not in the score.
        </p>
      ) : null}

      <p className="mt-4 text-sm text-muted">{COPY.noApproval}</p>
      <p className="mt-1 text-sm text-muted">
        Example — synthetic, not actual Toyota Financial Services pricing.
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/savings" className="font-medium text-jade-800">
          Move the daily miles
        </Link>
        <Link href="/charging" className="font-medium text-jade-800">
          Charging
        </Link>
        <Link href="/signup" className="text-ink">
          Change the answers
        </Link>
      </div>

      <WhyDrawer result={result} />
      <Runners result={result} />
    </div>
  );
}

function WhyDrawer({ result }: { result: SwitchResult }) {
  const option = result.winner;
  const rows = [
    ["Charging", "charging", option.gates.charging],
    ["Daily drive", "daily", option.gates.daily],
    ["Budget", "budget", option.gates.budget],
    ["Equity", "equity", option.gates.equity],
    ["Payback", "payback", option.gates.payback],
  ] as const;

  return (
    <details className="mt-8 border border-line bg-white p-4">
      <summary className="text-sm font-medium">Why this?</summary>
      <p className="mt-3 text-sm text-muted">
        Each gate is 0 to 1. Under 0.4 the verdict is Not yet. All applicable gates at 0.7 or
        above, and a plug-in range that covers the day, is Viable.
        {option.limiting ? ` The lowest gate is ${option.limiting}.` : ""}
      </p>
      <ul className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="font-medium">
              {value === null ? "Not applicable" : value.toFixed(2)}
              {option.limiting === key ? " · limiting" : ""}
            </span>
          </li>
        ))}
      </ul>
      <Assumptions result={result} />
    </details>
  );
}

function Assumptions({ result }: { result: SwitchResult }) {
  const { assumptions } = result;
  return (
    <div className="mt-4 border-t border-line pt-3 text-sm text-muted">
      <p>{assumptions.drivingDays} driving days a year. Gas at ${assumptions.gasDollarsPerGallon.toFixed(2)} a gallon, from the FuelEconomy.gov cache.</p>
      <p className="mt-1">
        Electricity at {assumptions.electricityCentsPerKwh}¢ per kWh. That is a state average, not a household bill.
      </p>
      <p className="mt-1">
        Example tax treatment — varies by state. This run uses {(FINANCING.salesTaxRate * 100).toFixed(2)}% on the price after the trade-in, plus {formatDollars(FINANCING.titleFeesCents)} in fees. The example rate is {formatPercent(assumptions.apr)} for {assumptions.termMonths} months.
      </p>
      <p className="mt-1">{COPY.modelledValue}</p>
      <p className="mt-1">{COPY.tailpipe}</p>
    </div>
  );
}

function Runners({ result }: { result: SwitchResult }) {
  return (
    <div className="mt-6 grid gap-3">
      {result.runners.map((option) => (
        <details key={option.id} className="border border-line bg-white px-4 py-3">
          <summary className="text-sm">
            {option.label} · {POWERTRAIN_LABEL[option.powertrain]} · {VERDICT_LABEL[option.verdict]}
          </summary>
          <p className="mt-2 text-sm text-muted">
            {formatDollars(option.paymentCents)}/mo example payment.{" "}
            {formatDollars(option.monthlyEnergySavingCents * 12)} a year in energy.
          </p>
        </details>
      ))}
      <details className="border border-line bg-white px-4 py-3">
        <summary className="text-sm">{result.keep.label}</summary>
        <p className="mt-2 text-sm text-muted">
          {formatDollars(result.keep.paymentCents)}/mo today, and{" "}
          {formatDollars(result.keep.annualEnergyCents)} a year in fuel. Trade-in estimate{" "}
          {formatDollars(result.valuation.tradeInCents)}, modelled.
          {result.negativeEquity
            ? ` Equity is negative by ${formatDollars(Math.abs(result.equityCents))}.`
            : ` Equity is ${formatDollars(result.equityCents)}.`}
        </p>
      </details>
      {result.aboveBudget.length > 0 ? (
        <p className="text-sm text-muted">
          Above the budget: {result.aboveBudget.map((option) => option.label).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
