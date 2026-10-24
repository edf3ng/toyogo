"use client";

import dynamic from "next/dynamic";
import { VehicleSilhouette } from "@/components/VehicleSilhouette";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), {
  ssr: false,
  loading: () => <VehicleSilhouette className="h-96" />,
});

export function HomeCar() {
  return <VehicleViewer paint="#1F4E79" frame="trip" />;
}
