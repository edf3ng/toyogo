"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ChargerPin } from "@/components/ChargingMap";
import type { SavedTrip } from "@/lib/trip";
import type { Powertrain } from "@/types";

const ChargingMap = dynamic(() => import("@/components/ChargingMap"), { ssr: false });

function milesApart(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ChargingPanel({
  trip,
  suggestion,
}: {
  trip: SavedTrip;
  suggestion: { label: string; powertrain: Powertrain };
}) {
  const [miles, setMiles] = useState(10);
  const [center, setCenter] = useState({ lat: 30.267, lon: -97.743, place: trip.place || "Austin" });
  const [stations, setStations] = useState<ChargerPin[]>([]);
  const [source, setSource] = useState("");
  const hybrid = suggestion.powertrain === "hybrid" || suggestion.powertrain === "gas";

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
    const controller = new AbortController();
    fetch(`/api/chargers?lat=${center.lat}&lon=${center.lon}&miles=30`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { stations?: ChargerPin[]; source?: string }) => {
        setStations(body.stations ?? []);
        setSource(body.source ?? "cache");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [center.lat, center.lon, hybrid]);

  const visible = stations.filter(
    (station) => milesApart(center.lat, center.lon, station.lat, station.lon) <= miles + 0.05,
  );

  if (hybrid) {
    return (
      <p>
        The {suggestion.label} is a standard hybrid. It runs on petrol and charges its own small battery while
        driving. No charging stop is needed, and there is no map for this suggestion.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Near {center.place}, {miles} mi radius.
        {source === "cache" ? " Saved Austin sample." : ""}
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
        <ChargingMap lat={center.lat} lon={center.lon} miles={miles} stations={visible} height={280} />
      </div>
      <p className="mt-2 text-sm text-muted">{visible.length} stations in this search.</p>
    </div>
  );
}
