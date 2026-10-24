"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeCar } from "@/components/HomeCar";
import { Mountains } from "@/components/Mountains";
import { readTrip } from "@/lib/trip";

export default function DrivePage() {
  const router = useRouter();
  const [moving, setMoving] = useState(true);
  const [paint, setPaint] = useState("#1F4E79");

  useEffect(() => {
    const trip = readTrip();
    if (!trip) {
      router.replace("/signup");
      return;
    }
    setPaint(trip.paint);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = window.setTimeout(() => setMoving(false), reduced ? 400 : 4200);
    const next = window.setTimeout(() => router.push("/dashboard"), reduced ? 1200 : 6000);
    return () => {
      window.clearTimeout(stop);
      window.clearTimeout(next);
    };
  }, [router]);

  return (
    <section className="relative h-dvh overflow-hidden">
      <Mountains drift moving={moving} showSign={!moving} />
      <div className="pointer-events-none absolute inset-x-0 bottom-[8%] h-[46vh]">
        <HomeCar paint={paint} circling={false} rolling={moving} profile />
      </div>
    </section>
  );
}
