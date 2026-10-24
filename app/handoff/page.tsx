"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COPY, HORIZON_LABEL, MIX_LABEL, PRIORITY_LABEL, UPCOMING_LABEL } from "@/config/copy";
import { HANDOFF_KEY, type HandoffSnapshot } from "@/lib/handoff";
import { formatDollars, formatPounds } from "@/lib/format";

export default function HandoffPage() {
  const [snapshot, setSnapshot] = useState<HandoffSnapshot | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return;
    try {
      setSnapshot(JSON.parse(raw) as HandoffSnapshot);
    } catch {
      setSnapshot(null);
    }
  }, []);

  if (!snapshot) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Summary</h1>
        <p className="mt-2 text-sm">
          Finish the four steps first. The summary is kept in this browser tab, not on a server.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-jade-800">
          Back to the flow
        </Link>
      </section>
    );
  }

  const { result } = snapshot;
  return (
    <article>
      <p className="text-sm text-muted">{COPY.exampleTerms}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">ToyoGo summary</h1>
      <p className="mt-1 text-sm">{snapshot.who}</p>

      <h2 className="mt-6 text-base font-semibold">Situation</h2>
      <p className="text-sm">{snapshot.vehicleLine}</p>
      <p className="text-sm">{snapshot.mileage.toLocaleString("en-US")} miles on the odometer.</p>
      <p className="text-sm">{snapshot.contractLine}</p>
      <p className="text-sm">
        {snapshot.driving.annualMiles.toLocaleString("en-US")} miles a year,{" "}
        {MIX_LABEL[snapshot.driving.mix].toLowerCase()}. Keep the car:{" "}
        {HORIZON_LABEL[snapshot.driving.horizon]}. Priority:{" "}
        {PRIORITY_LABEL[snapshot.driving.priority]}. Coming up:{" "}
        {UPCOMING_LABEL[snapshot.driving.upcoming]}.
      </p>

      <h2 className="mt-6 text-base font-semibold">Recommendation</h2>
      <p className="text-sm font-medium">{result.headline.title}</p>
      {result.headline.vehicleLabel ? (
        <p className="text-sm">{result.headline.vehicleLabel}</p>
      ) : null}
      <p className="text-sm">
        {formatDollars(result.headline.monthlyPaymentCents)} a month. Fuel{" "}
        {direction(result.headline.annualFuelSavingsCents, formatDollars)} a year. Tailpipe CO2{" "}
        {direction(result.headline.annualCo2AvoidedLbs, formatPounds)} a year.
      </p>
      <p className="text-sm">Next step: {result.headline.next.title}. {result.headline.next.body}</p>

      <h2 className="mt-6 text-base font-semibold">Also considered</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="py-1 font-medium">Move</th>
            <th className="py-1 font-medium">Monthly</th>
          </tr>
        </thead>
        <tbody>
          {result.ranked.map((move) => (
            <tr key={`${move.id}-${move.variant ?? "base"}`} className="border-b border-line">
              <td className="py-1">{move.title}</td>
              <td className="py-1 tabular-nums">{formatDollars(move.monthlyPaymentCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.ruledOut.length > 0 ? (
        <>
          <h2 className="mt-6 text-base font-semibold">Ruled out</h2>
          <ul className="mt-1 text-sm">
            {result.ruledOut.map((item) => (
              <li key={item.title}>
                {item.title}: {item.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-6 text-sm">{COPY.footer}</p>
      <p className="text-sm">{COPY.noApproval}</p>

      <button
        type="button"
        className="no-print mt-6 h-11 rounded-md bg-jade px-4 text-sm font-medium text-white"
        onClick={() => window.print()}
      >
        Print or save as PDF
      </button>
    </article>
  );
}

function direction(value: number, format: (value: number) => string): string {
  if (value === 0) return "unchanged";
  return `${format(Math.abs(value))} ${value > 0 ? "less" : "more"}`;
}
