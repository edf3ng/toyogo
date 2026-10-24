"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Landmark } from "@/components/Landmark";
import type { ChargerPin } from "@/components/ChargingMap";
import { recommendSwitch } from "@/lib/engine/switch";
import { readTrip, type SavedTrip } from "@/lib/trip";

const ChargingMap = dynamic(() => import("@/components/ChargingMap"), { ssr: false });

export default function ChargingPage() {
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const [miles, setMiles] = useState(10);
  const [center, setCenter] = useState({ lat: 30.267, lon: -97.743, place: "Austin" });
  const [stations, setStations] = useState<ChargerPin[]>([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    const saved = readTrip();
    setTrip(saved);
    const zip = saved?.zip ?? "78704";
    fetch(`/api/geo?zip=${zip}`)
      .then((response) => response.json())
      .then((body: { lat: number; lon: number; place: string }) => {
        if (Number.isFinite(body.lat) && Number.isFinite(body.lon)) {
          setCenter({ lat: body.lat, lon: body.lon, place: body.place });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch(`/api/chargers?lat=${center.lat}&lon=${center.lon}&miles=${miles}`)
        .then((response) => response.json())
        .then((body: { stations?: ChargerPin[]; source?: string }) => {
          setStations(body.stations ?? []);
          setSource(body.source ?? "cache");
        })
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [center.lat, center.lon, miles]);

  if (trip === undefined) return <p className="text-sm text-muted">Loading.</p>;
  if (!trip) {
    return (
      <Landmark marker="Trail shelter" kicker="Pullout" title="Charging">
        <Link href="/signup" className="mt-4 inline-block text-sm font-medium text-jade-800">
          Sign up
        </Link>
      </Landmark>
    );
  }

  const winner = recommendSwitch(trip.input).winner;
  const hybrid = winner.powertrain === "hybrid" || winner.powertrain === "gas";

  return (
    <Landmark marker="Trail shelter" kicker="Pullout" title="Charging">
      {hybrid ? (
        <p className="mt-4">
          A standard hybrid does not plug in. It runs on petrol and charges its own small battery
          while driving. No charging stop is needed, and there is no map for this recommendation.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Pins near {center.place}. Radius {miles} miles. Charger data © Open Charge Map
            contributors, CC BY 4.0. Map tiles © OpenStreetMap.
            {source === "cache" ? " This view is the saved Austin sample." : ""}
          </p>
          <label className="mt-4 block text-sm font-medium">
            Radius, {miles} miles
            <input
              className="mt-2 w-full"
              type="range"
              min={2}
              max={30}
              value={miles}
              onChange={(event) => setMiles(Number(event.target.value))}
            />
          </label>
          <div className="mt-4 overflow-hidden border border-line">
            <ChargingMap lat={center.lat} lon={center.lon} stations={stations} />
          </div>
          <p className="mt-2 text-sm text-muted">{stations.length} stations in this search.</p>
        </>
      )}
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-jade-800">
        Back to recommendations
      </Link>
    </Landmark>
  );
}
