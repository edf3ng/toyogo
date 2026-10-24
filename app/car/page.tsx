"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { COPY } from "@/config/copy";
import { PAINTS } from "@/config/vehicles";
import { VehicleSilhouette } from "@/components/VehicleSilhouette";

const VehicleViewer = dynamic(() => import("@/components/VehicleViewer"), {
  ssr: false,
  loading: () => <VehicleSilhouette className="h-[70vh] min-h-[32rem]" />,
});

export default function CarPage() {
  const [paintId, setPaintId] = useState("blueprint");
  const paint = PAINTS.find((item) => item.id === paintId) ?? PAINTS[0];

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">The Corolla</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Drag to turn it. The paint swatches change the body only. Glass, lamps, and the wheels stay
        as they were exported.
      </p>
      <div className="mt-5">
        <VehicleViewer paint={paint.hex} frame="stage" />
        <div className="mt-3 flex flex-wrap gap-2">
          {PAINTS.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.name}
              title={swatch.name}
              onClick={() => setPaintId(swatch.id)}
              className={`h-8 w-8 border ${swatch.id === paint.id ? "border-jade-800" : "border-line"}`}
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm">
          {paint.name}. <span className="text-muted">{COPY.stylisedVehicle}</span>
        </p>
      </div>
      <div className="mt-6 max-w-2xl border-t border-line pt-4 text-sm">
        <p>{COPY.modelCredit}</p>
        <p className="mt-2 text-muted">
          An E80 is an older Corolla than the cars in the three scenarios. It is here so the trip
          has one model to turn, not because Elena drives this body.
        </p>
        <p className="mt-4">
          <Link href="/" className="text-jade-800">
            Back to the trip
          </Link>
        </p>
      </div>
    </section>
  );
}
