"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface ChargerPin {
  id: number;
  title: string;
  lat: number;
  lon: number;
  address: string;
  town: string;
}

export default function ChargingMap({
  lat,
  lon,
  stations,
  height = 360,
}: {
  lat: number;
  lon: number;
  stations: ChargerPin[];
  height?: number;
}) {
  return (
    <MapContainer center={[lat, lon]} zoom={12} scrollWheelZoom={false} style={{ height, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[lat, lon]} radius={8} pathOptions={{ color: "#14202a", fillColor: "#e8913a", fillOpacity: 1 }}>
        <Popup>Search center</Popup>
      </CircleMarker>
      {stations.map((station) => (
        <CircleMarker
          key={station.id}
          center={[station.lat, station.lon]}
          radius={7}
          pathOptions={{ color: "#0a6361", fillColor: "#0e7c7b", fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>{station.title}</strong>
            <br />
            {station.address} {station.town}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
