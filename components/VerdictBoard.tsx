"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COPY } from "@/config/copy";
import { FINANCING } from "@/config/financing";
import { Landmark } from "@/components/Landmark";
import { formatDollars, formatPercent } from "@/lib/format";
import { recommendSwitch, type RankedSwitch, type SwitchResult } from "@/lib/engine/switch";
import type { Verdict } from "@/lib/engine/viability";
import { readTrip, type SavedTrip } from "@/lib/trip";

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

const EVIDENCE = [
  { href: "/trade-in", label: "Trade-in value" },
  { href: "/savings", label: "Fuel savings" },
  { href: "/charging", label: "Charging nearby" },
  { href: "/impact", label: "Emissions" },
];

function paybackLabel(months: number): string {
  if (!Number.isFinite(months)) return "Fuel savings alone don't cover the payment increase";
  if (months <= 0) return "The payment is not higher than today";
  return `${Math.round(months)} months`;
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
    return { value: formatDollars(annual), caption: "a year in fuel. A standard hybrid does not plug in." };
  }
  return {
    value: formatDollars(annual),
    caption: "a year in energy cost compared with keeping this car. Tailpipe CO2 on a battery EV is 0.",
  };
}

export function VerdictBoard() {
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);

  useEffect(() => {
    setTrip(readTrip());
  }, []);

  if (trip === undefined) return <p className="text-sm text-muted">Loading the recommendation.</p>;
  if (!trip) {
    return (
      <Landmark marker="Recommendations" kicker="Summit" title="No car on file yet">
        <p className="mt-3 text-sm">Sign up with your Toyota and the drive will end on a recommendation.</p>
        <Link href="/signup" className="mt-4 inline-flex h-11 items-center rounded-md bg-jade px-4 text-sm font-medium text-white">
          Sign up
        </Link>
      </Landmark>
    );
  }

  const result = recommendSwitch(trip.input);
  const winner = result.winner;

  return (
    <Landmark marker="Recommendations" kicker="Summit" title={`${VERDICT_LABEL[winner.verdict]} · ${winner.label}`}>
      <p className="mt-2 text-sm text-jade-800">{POWERTRAIN_LABEL[winner.powertrain]}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{hero(winner).value}</p>
      <p className="mt-1 text-sm text-muted">{hero(winner).caption}</p>
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
          The trade is underwater by {formatDollars(Math.abs(winner.equityCents))}. That shortfall is part of the
          next amount financed, and it is shown on its own.
        </p>
      ) : null}
      {trip.other ? <p className="mt-4 text-sm">You also wrote: “{trip.other}”. That note is not in the score.</p> : null}
      <div className="mt-6 grid gap-3">
        {EVIDENCE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-12 items-center justify-between rounded-md border border-line bg-white px-4 text-sm font-medium hover:border-jade-800"
          >
            {item.label}
            <span className="text-jade-800">Open</span>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{COPY.noApproval}</p>
      <p className="mt-1 text-sm text-muted">Example — synthetic, not actual Toyota Financial Services pricing.</p>
      <WhyDrawer result={result} />
    </Landmark>
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
    <details className="mt-6 border border-line bg-white p-4">
      <summary className="text-sm font-medium">Why this?</summary>
      <ul className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="font-medium">
              {value === null ? "Not applicable" : value.toFixed(2)}
              {option.verdict !== "viable" && option.limiting === key ? " · limiting" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        {result.assumptions.drivingDays} driving days a year. Gas at $
        {result.assumptions.gasDollarsPerGallon.toFixed(2)} a gallon until the savings page loads a fresher price.
        Electricity at {result.assumptions.electricityCentsPerKwh}¢ per kWh, a state average. Example tax treatment
        — varies by state — {(FINANCING.salesTaxRate * 100).toFixed(2)}% after the trade-in. Example rate{" "}
        {formatPercent(result.assumptions.apr)} for {result.assumptions.termMonths} months. {COPY.modelledValue}
      </p>
    </details>
  );
}
