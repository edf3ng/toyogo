"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ChargerPin } from "@/components/ChargingMap";
import { recommendSwitch } from "@/lib/engine/switch";
import type { SavedTrip } from "@/lib/trip";

const ChargingMap = dynamic(() => import("@/components/ChargingMap"), { ssr: false });

export function ChargingPanel({ trip }: { trip: SavedTrip }) {
  const [miles, setMiles] = useState(10);
  const [center, setCenter] = useState({ lat: 30.267, lon: -97.743, place: trip.place || "Austin" });
  const [stations, setStations] = useState<ChargerPin[]>([]);
  const [source, setSource] = useState("");
  const winner = recommendSwitch(trip.input).winner;
  const hybrid = winner.powertrain === "hybrid" || winner.powertrain === "gas";

  useEffect(() => {
    fetch(`/api/geo?zip=${trip.zip || "78704"}`)
      .then((response) => response.json())
      .then((body: { lat: number; lon: number; place: string }) => {
        if (Number.isFinite(body.lat) && Number.isFinite(body.lon)) {
          setCenter({ lat: body.lat, lon: body.lon, place: body.place });
        }
      })
      .catch(() => undefined);
  }, [trip.zip]);

  useEffect(() => {
    if (hybrid) return;
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
  }, [center.lat, center.lon, hybrid, miles]);

  if (hybrid) {
    return (
      <p>
        A standard hybrid does not plug in. It runs on petrol and charges its own small battery while driving. No
        charging stop is needed, and there is no map for this recommendation.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Pins near {center.place}. Radius {miles} miles. Charger data © Open Charge Map contributors, CC BY 4.0. Map
        tiles © OpenStreetMap.
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
        <ChargingMap lat={center.lat} lon={center.lon} stations={stations} height={280} />
      </div>
      <p className="mt-2 text-sm text-muted">{stations.length} stations in this search.</p>
    </div>
  );
}
