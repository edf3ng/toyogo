"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { recommendSwitch } from "@/lib/engine/switch";
import { readTrip, tripFromDriver, type SavedTrip } from "@/lib/trip";

export default function ChargingPage() {
  const [trip, setTrip] = useState<SavedTrip | null>(null);

  useEffect(() => {
    setTrip(readTrip() ?? tripFromDriver("alex"));
  }, []);

  if (!trip) return <p className="text-sm text-muted">Loading.</p>;

  const result = recommendSwitch(trip.input);
  const hybrid = result.winner.powertrain === "hybrid" || result.winner.powertrain === "gas";

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Charging</h1>
      {hybrid ? (
        <p className="mt-4">
          A standard hybrid does not plug in. It runs on petrol and charges its own small battery
          while driving. No charging stop is needed, and there is no map to show.
        </p>
      ) : (
        <>
          <p className="mt-4">
            {trip.input.chargeAccess === "yes"
              ? "Home charging covers this recommendation."
              : trip.input.stationCount === 0
                ? "No home charger and no stations in this ZIP. A plug-in is not the right next car."
                : `${trip.input.stationCount} example stations sit inside this demo's Austin radius.`}
          </p>
          <p className="mt-3 text-sm text-muted">
            Live charger pins come from Open Charge Map. Data © Open Charge Map contributors, CC
            BY 4.0. This screen uses the station count already in the verdict so the demo still
            works with no network.
          </p>
        </>
      )}
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-jade-800">
        Back to the verdict
      </Link>
    </section>
  );
}
