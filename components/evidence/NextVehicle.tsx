"use client";

import { useEffect, useState } from "react";
import { RoadLoader } from "@/components/RoadLoader";
import type { Advice, Pick } from "@/lib/advice";
import type { SwitchInput } from "@/lib/engine/switch";

const POWERTRAIN_LABEL: Record<Pick["powertrain"], string> = {
  hybrid: "Hybrid · never plugs in",
  phev: "Plug-in hybrid",
  bev: "Battery electric",
};

const dollars = (cents: number) =>
  Math.round(cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Figures({ figures }: { figures: NonNullable<Pick["figures"]> }) {
  const payback = Number.isFinite(figures.paybackMonths)
    ? `${Math.round(figures.paybackMonths)} months`
    : "Not on fuel alone";
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted">Example payment</dt>
        <dd className="font-medium">{dollars(figures.paymentCents)}/mo</dd>
      </div>
      <div>
        <dt className="text-muted">Fuel saved</dt>
        <dd className="font-medium">{dollars(figures.annualFuelSavedCents)}/yr</dd>
      </div>
      <div>
        <dt className="text-muted">CO2 avoided</dt>
        <dd className="font-medium">{figures.co2AvoidedLbs.toLocaleString("en-US")} lb/yr</dd>
      </div>
      <div>
        <dt className="text-muted">Payback</dt>
        <dd className="font-medium">{payback}</dd>
      </div>
    </dl>
  );
}

export function NextVehicle({ input }: { input: SwitchInput }) {
  const [state, setState] = useState<"loading" | "none" | Advice>("loading");
  const [chosen, setChosen] = useState(0);
  const key = JSON.stringify(input);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setChosen(0);
    fetch("/api/advice", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: JSON.parse(key) as SwitchInput }),
    })
      .then((response) => response.json())
      .then((body: { advice?: Advice | null }) => {
        if (!controller.signal.aborted) setState(body.advice ?? "none");
      })
      // An aborted fetch rejects as a plain TypeError in Safari, not an
      // AbortError, so the signal is what says whether this run still counts.
      .catch(() => {
        if (!controller.signal.aborted) setState("none");
      });
    return () => controller.abort();
  }, [key]);

  if (state === "none") return null;

  return (
    <div className="mt-6 border-t border-line pt-4">
      <h2 className="text-lg font-semibold">What to consider next</h2>
      {state === "loading" ? (
        <>
          <p className="mt-1 text-sm text-muted">Weighing your miles, charging and budget…</p>
          <RoadLoader />
        </>
      ) : (
        <Picks advice={state} chosen={chosen} onChoose={setChosen} />
      )}
    </div>
  );
}

function Picks({ advice, chosen, onChoose }: { advice: Advice; chosen: number; onChoose: (index: number) => void }) {
  const pick = advice.picks[chosen] ?? advice.picks[0];
  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {advice.source === "gemini"
          ? "Three picked by Gemini from Toyota's electrified line-up, for your figures. Not an offer."
          : "The scorer's own ranking. Not an offer."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Recommended vehicles">
        {advice.picks.map((item, index) => (
          <button
            key={item.model}
            type="button"
            role="tab"
            id={`pick-tab-${index}`}
            aria-selected={index === chosen}
            aria-controls={`pick-panel-${index}`}
            onClick={() => onChoose(index)}
            className={`rounded-md border px-3 py-2 text-left text-sm ${
              index === chosen ? "border-jade bg-jade text-white" : "border-line bg-white text-ink"
            }`}
          >
            <span className="block font-medium">{item.title}</span>
            <span className={`block text-xs ${index === chosen ? "text-white/80" : "text-muted"}`}>
              {item.year} {item.model}
            </span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pick-panel-${chosen}`} aria-labelledby={`pick-tab-${chosen}`}>
        <p className="mt-4 text-2xl font-semibold tracking-tight">
          {pick.year} {pick.model}
        </p>
        <p className="text-sm text-muted">
          {POWERTRAIN_LABEL[pick.powertrain]}
          {pick.body ? ` · ${pick.body}` : ""}
        </p>
        <ul className="mt-3 grid gap-2 text-sm">
          {pick.why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <span className="text-muted">Trade-off: </span>
          {pick.tradeoff}
        </p>
        {pick.figures ? (
          <Figures figures={pick.figures} />
        ) : (
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
            This one is outside the priced line-up, so no payment or savings figures are modelled for it.
          </p>
        )}
      </div>
    </>
  );
}
