"use client";

import dynamic from "next/dynamic";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), { ssr: false });

export function HomeCar({
  paint = "#1F4E79",
  circling = true,
  rolling = false,
  profile = false,
}: {
  paint?: string;
  circling?: boolean;
  rolling?: boolean;
  profile?: boolean;
}) {
  return (
    <VehicleViewer paint={paint} frame="hero" circling={circling} rolling={rolling} profile={profile} />
  );
}
