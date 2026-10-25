"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HomeCar } from "@/components/HomeCar";
import { ACCOUNT_CHANGED } from "@/lib/account";
import { recommendSwitch } from "@/lib/engine/switch";
import { suggestionModelUrl } from "@/lib/models";
import { readTrip, type SavedTrip } from "@/lib/trip";

export default function Home() {
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setTrip(readTrip());
      setSelectedRecommendationId(null);
    };
    sync();
    window.addEventListener(ACCOUNT_CHANGED, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED, sync);
  }, []);

  const recommendations = useMemo(
    () => trip ? recommendSwitch(trip.input).ranked : [],
    [trip],
  );
  const selectedRecommendation = recommendations.find((car) => car.id === selectedRecommendationId);
  const displayedCar = selectedRecommendation ?? trip?.input.current;

  return (
    <section className="relative h-dvh overflow-hidden bg-white">
      <HomeCar
        paint={trip?.paint}
        modelUrl={displayedCar ? suggestionModelUrl(displayedCar.model, selectedRecommendation?.label ?? "") : undefined}
      />
      <div className="pointer-events-none absolute inset-x-6 bottom-6 z-10 flex flex-col gap-5 font-sans text-ink sm:inset-x-10 sm:bottom-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-md">
          {trip ? (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Preview a car">
                <button
                  type="button"
                  aria-pressed={!selectedRecommendation}
                  onClick={() => setSelectedRecommendationId(null)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${!selectedRecommendation ? "bg-jade text-white" : "bg-paper text-ink"}`}
                >
                  My car
                </button>
                <button
                  type="button"
                  aria-pressed={!!selectedRecommendation}
                  disabled={!recommendations.length}
                  onClick={() => setSelectedRecommendationId(recommendations[0]?.id ?? null)}
                  className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${selectedRecommendation ? "bg-jade text-white" : "bg-paper text-ink"}`}
                >
                  Recommendations
                </button>
              </div>
              {selectedRecommendation ? (
                <div className="mt-3">
                  <label htmlFor="home-recommendation" className="block text-xs font-medium text-muted">Preview a recommended car</label>
                  <select
                    id="home-recommendation"
                    value={selectedRecommendation.id}
                    onChange={(event) => setSelectedRecommendationId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                  >
                    {recommendations.map((car) => <option key={car.id} value={car.id}>{car.label}</option>)}
                  </select>
                  <p className="mt-2 text-xs text-muted">
                    {selectedRecommendation.verdict === "viable" ? "Fits your preferences." : selectedRecommendation.verdict === "caveats" ? "Recommended with caveats." : "May not be a fit yet."} Preview only.
                  </p>
                  <Link href="/dashboard?tab=suggestions" className="mt-2 inline-block text-sm font-medium text-jade-800 underline underline-offset-4">View comparison</Link>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  {recommendations.length ? "Explore cars ranked for your preferences." : "No recommended cars currently meet your budget."}
                </p>
              )}
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium text-jade-800">Log in to explore recommended cars →</Link>
          )}
        </div>
        <div className="min-w-0 self-end text-right" aria-live="polite">
        <p className="text-xs font-medium tracking-[0.2em] text-muted sm:text-sm">
          {displayedCar?.year ?? 2025}
        </p>
        <p className="mt-1 max-w-[80vw] text-3xl font-medium tracking-tight text-muted sm:text-5xl">
          {displayedCar?.model ?? "Camry"}
        </p>
        </div>
      </div>
    </section>
  );
}
