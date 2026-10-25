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

export function useVehicleAdvice(input: SwitchInput | null) {
  const [advice, setAdvice] = useState<Advice | "loading" | "none">("loading");
  const [chosen, setChosen] = useState(0);
  const key = input ? JSON.stringify(input) : "";

  useEffect(() => {
    if (!key) {
      setAdvice("loading");
      return;
    }
    const controller = new AbortController();
    setAdvice("loading");
    setChosen(0);
    fetch("/api/advice", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: JSON.parse(key) as SwitchInput }),
    })
      .then((response) => response.json())
      .then((body: { advice?: Advice | null }) => {
        if (!controller.signal.aborted) setAdvice(body.advice?.picks?.length ? body.advice : "none");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAdvice("none");
      });
    return () => controller.abort();
  }, [key]);

  const pick = typeof advice === "object" ? (advice.picks[chosen] ?? advice.picks[0]) : null;
  return { advice, chosen, setChosen, pick };
}

export function SuggestionChoices({
  advice,
  chosen,
  onChoose,
}: {
  advice: Advice;
  chosen: number;
  onChoose: (index: number) => void;
}) {
  const pick = advice.picks[chosen] ?? advice.picks[0];
  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {advice.source === "gemini"
          ? "Gemini's suggestions for this car. Each one has its own gas savings, charging, and emissions."
          : "Gemini didn't answer, so these are the scorer's own options. Each one still has its own tabs."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Suggested vehicles">
        {advice.picks.map((item, index) => (
          <button
            key={`${item.year}-${item.model}`}
            type="button"
            role="tab"
            id={`pick-tab-${index}`}
            aria-selected={index === chosen}
            aria-controls="suggestion-panel"
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
      <div id="suggestion-panel" role="tabpanel" aria-labelledby={`pick-tab-${chosen}`}>
        <p className="mt-4 text-sm text-muted">
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
      </div>
    </>
  );
}

export function AdvicePending() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Checking this car</h1>
      <p className="mt-3 text-sm text-muted">A suggestion waits until Gemini has chosen one.</p>
      <RoadLoader />
    </div>
  );
}
