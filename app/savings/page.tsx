"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDollars } from "@/lib/format";
import { recommendSwitch } from "@/lib/engine/switch";
import { readTrip, tripFromDriver, type SavedTrip } from "@/lib/trip";

export default function SavingsPage() {
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [daily, setDaily] = useState(22);

  useEffect(() => {
    const saved = readTrip() ?? tripFromDriver("blair");
    setTrip(saved);
    setDaily(saved.input.dailyMiles);
  }, []);

  if (!trip) return <p className="text-sm text-muted">Loading.</p>;

  const result = recommendSwitch({ ...trip.input, dailyMiles: daily });
  const winner = result.winner;

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Daily miles</h1>
      <p className="mt-2 text-sm text-muted">
        Drag the day longer or shorter. A plug-in&apos;s electric share is the part of the day that
        fits inside its electric range.
      </p>
      <label className="mt-6 block text-sm font-medium">
        {daily} miles a day
        <input
          className="mt-2 w-full"
          type="range"
          min={5}
          max={120}
          value={daily}
          onChange={(event) => setDaily(Number(event.target.value))}
        />
      </label>
      <p className="mt-6 text-sm font-medium text-jade-800">{winner.label}</p>
      {winner.powertrain === "phev" ? (
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          {Math.round(winner.electricShare * 100)}%
        </p>
      ) : (
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          {formatDollars(winner.monthlyEnergySavingCents * 12)}
        </p>
      )}
      <p className="mt-1 text-sm text-muted">
        {winner.powertrain === "phev"
          ? "of these miles on a charge. Past the electric range, the rest is petrol."
          : "a year in energy cost versus keeping the current car."}
      </p>
      <p className="mt-3 text-sm">
        Example payment {formatDollars(winner.paymentCents)}/mo. Energy this year{" "}
        {formatDollars(winner.annualEnergyCents)}.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-jade-800">
        Back to the verdict
      </Link>
    </section>
  );
}
