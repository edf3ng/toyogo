"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Landmark } from "@/components/Landmark";
import { formatNumber } from "@/lib/format";
import { recommendSwitch } from "@/lib/engine/switch";
import { readTrip, type SavedTrip } from "@/lib/trip";

export default function ImpactPage() {
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const [annual, setAnnual] = useState(12000);

  useEffect(() => {
    const saved = readTrip();
    setTrip(saved);
    if (saved) setAnnual(saved.input.dailyMiles * 250);
  }, []);

  if (trip === undefined) return <p className="text-sm text-muted">Loading.</p>;
  if (!trip) {
    return (
      <Landmark marker="Alpine meadow" kicker="Summit" title="Emissions">
        <Link href="/signup" className="mt-4 inline-block text-sm font-medium text-jade-800">
          Sign up
        </Link>
      </Landmark>
    );
  }

  const result = recommendSwitch({ ...trip.input, dailyMiles: annual / 250 });
  const keep = Math.max(0, result.keep.annualCo2Lbs);
  const next = Math.max(0, result.winner.annualCo2Lbs);
  const avoided = Math.max(0, keep - next);
  const scale = Math.max(keep, 1);

  return (
    <Landmark marker="Alpine meadow" kicker="Summit" title="Tailpipe CO2">
      <p className="mt-2 text-sm text-muted">
        Tailpipe only. A battery EV is 0 grams at the tailpipe. Making the electricity is not in this figure.
      </p>
      <label className="mt-6 block text-sm font-medium">
        {formatNumber(annual)} miles a year
        <input
          className="mt-2 w-full"
          type="range"
          min={2000}
          max={30000}
          step={500}
          value={annual}
          onChange={(event) => setAnnual(Number(event.target.value))}
        />
      </label>
      <p className="mt-6 text-4xl font-semibold tracking-tight">{formatNumber(Math.round(avoided))} lb</p>
      <p className="text-sm text-muted">less tailpipe CO2 a year on {result.winner.label}.</p>
      <div className="mt-8 grid grid-cols-2 items-end gap-6">
        <figure>
          <div className="flex h-48 items-end bg-[#e7f2f0]">
            <div className="w-full bg-ink" style={{ height: `${Math.max(8, (keep / scale) * 100)}%` }} />
          </div>
          <figcaption className="mt-2 text-sm">
            Keep the {trip.input.current.year} {trip.input.current.model}
            <span className="mt-1 block font-medium">{formatNumber(Math.round(keep))} lb</span>
          </figcaption>
        </figure>
        <figure>
          <div className="flex h-48 items-end bg-[#e7f2f0]">
            <div className="w-full bg-jade" style={{ height: `${Math.max(next === 0 ? 4 : 8, (next / scale) * 100)}%` }} />
          </div>
          <figcaption className="mt-2 text-sm">
            {result.winner.label}
            <span className="mt-1 block font-medium">{formatNumber(Math.round(next))} lb</span>
          </figcaption>
        </figure>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-jade-800">
        Back to recommendations
      </Link>
    </Landmark>
  );
}
