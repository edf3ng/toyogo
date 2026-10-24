"use client";

import { useEffect, useState } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ChargerPin {
  id: number;
  title: string;
  lat: number;
  lon: number;
  address: string;
  town: string;
}

function dotRadius(zoom: number): number {
  return Math.min(7, Math.max(1.5, (zoom - 8) * 1.15));
}

function StationDots({ lat, lon, stations }: { lat: number; lon: number; stations: ChargerPin[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map]);
  const radius = dotRadius(zoom);
  const weight = radius < 3 ? 0 : 1;

  return (
    <>
      <CircleMarker
        center={[lat, lon]}
        radius={Math.min(8, radius + 2)}
        pathOptions={{ color: "#14202a", fillColor: "#e8913a", fillOpacity: 1, weight: 1 }}
      >
        <Popup>Search center</Popup>
      </CircleMarker>
      {stations.map((station) => (
        <CircleMarker
          key={station.id}
          center={[station.lat, station.lon]}
          radius={radius}
          pathOptions={{ color: "#0a6361", fillColor: "#0e7c7b", fillOpacity: 0.95, weight }}
        >
          <Popup>
            <strong>{station.title}</strong>
            <br />
            {station.address} {station.town}
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function FitSearch({ lat, lon, miles }: { lat: number; lon: number; miles: number }) {
  const map = useMap();
  useEffect(() => {
    const center = L.latLng(lat, lon);
    const bounds = center.toBounds(miles * 1609.344 * 2);
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [18, 18], animate: false });
  }, [lat, lon, map, miles]);
  return null;
}

export default function ChargingMap({
  lat,
  lon,
  miles,
  stations,
  height = 360,
}: {
  lat: number;
  lon: number;
  miles: number;
  stations: ChargerPin[];
  height?: number;
}) {
  return (
    <MapContainer center={[lat, lon]} zoom={12} scrollWheelZoom={false} style={{ height, width: "100%" }}>
      <FitSearch lat={lat} lon={lon} miles={miles} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[lat, lon]}
        radius={miles * 1609.344}
        pathOptions={{ color: "#0e7c7b", weight: 1.5, fillColor: "#0e7c7b", fillOpacity: 0.08 }}
      />
      <StationDots lat={lat} lon={lon} stations={stations} />
    </MapContainer>
  );
}
