"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Swap } from "@/components/appear";
import { SuggestionsPanel } from "@/components/evidence/SuggestionsPanel";
import { TradeInPanel } from "@/components/evidence/TradeInPanel";
import { HomeCar } from "@/components/HomeCar";
import { recommendSwitch, type RankedSwitch } from "@/lib/engine/switch";
import { MODEL_URLS, suggestionModelUrl } from "@/lib/models";
import { readTrip, type SavedTrip } from "@/lib/trip";
import { ACCOUNT_CHANGED } from "@/lib/account";

function modelFor(option: RankedSwitch | null, page: "analytics" | "suggestions"): string {
  if (page === "suggestions" && option) return suggestionModelUrl(option.model, option.label);
  return MODEL_URLS.camry;
}

const PAGES = [
  { id: "analytics", label: "Analytics" },
  { id: "suggestions", label: "Suggestions" },
] as const;

type PageId = (typeof PAGES)[number]["id"];

function isPage(value: string | null): value is PageId {
  return PAGES.some((page) => page.id === value);
}

export function Roadside() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const page: PageId = isPage(requested) ? requested : "analytics";
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const [picked, setPicked] = useState<RankedSwitch | null>(null);

  useEffect(() => {
    const sync = () => setTrip(readTrip());
    sync();
    window.addEventListener(ACCOUNT_CHANGED, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED, sync);
  }, []);

  const result = trip ? recommendSwitch(trip.input) : null;

  return (
    <section className="grid h-dvh grid-rows-[minmax(16rem,42vh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.9fr)] lg:grid-rows-1">
      <div className="relative min-h-0 overflow-hidden bg-white">
        <HomeCar paint={trip?.paint} modelUrl={modelFor(picked, page)} />
      </div>
      <aside className="flex min-h-0 flex-col overflow-hidden border-l border-line bg-paper">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-16 pb-6 lg:px-5">
          {trip === undefined ? (
            <Swap id="loading">
              <p className="text-sm text-muted">Loading your car.</p>
            </Swap>
          ) : null}
          {trip === null ? (
            <Swap id="empty">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">No car on file yet</h1>
                <p className="mt-3 text-sm">Sign up with your Toyota and the tabs fill in beside the car.</p>
                <Link
                  href="/signup"
                  className="mt-4 inline-flex h-11 items-center rounded-md bg-jade px-4 text-sm font-medium text-white"
                >
                  Sign up
                </Link>
              </div>
            </Swap>
          ) : null}
          {trip && result ? (
            <>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard">
                {PAGES.map((item) => {
                  const selected = item.id === page;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        selected ? "bg-jade text-white" : "border border-line bg-white text-ink"
                      }`}
                      onClick={() =>
                        router.replace(item.id === "analytics" ? "/dashboard" : `/dashboard?tab=${item.id}`, {
                          scroll: false,
                        })
                      }
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5">
                <Swap id={page}>
                  {page === "analytics" ? (
                    <div>
                      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
                      <p className="mt-1 text-sm text-muted">Trade-in and market price for the car you have now.</p>
                      <TradeInPanel trip={trip} />
                    </div>
                  ) : (
                    <SuggestionsPanel trip={trip} result={result} onSelect={setPicked} />
                  )}
                </Swap>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
