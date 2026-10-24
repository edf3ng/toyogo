"use client";

import dynamic from "next/dynamic";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), { ssr: false });

export function HomeCar({ paint = "#1F4E79" }: { paint?: string }) {
  return <VehicleViewer paint={paint} frame="hero" />;
}
