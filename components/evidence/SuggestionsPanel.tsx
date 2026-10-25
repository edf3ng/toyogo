"use client";

import { useEffect, useState } from "react";
import { PRIORITY_COPY } from "@/config/priorities";
import { COPY } from "@/config/copy";
import { ChargingPanel } from "@/components/evidence/ChargingPanel";
import { ImpactPanel } from "@/components/evidence/ImpactPanel";
import { SavingsPanel } from "@/components/evidence/SavingsPanel";
import { ScoreBars } from "@/components/ScoreBars";
import { formatDollars } from "@/lib/format";
import { viabilityMultiplier } from "@/lib/engine/viability";
import type { RankedSwitch, SwitchResult } from "@/lib/engine/switch";
import type { ExplainFacts } from "@/lib/explain";
import type { SavedTrip } from "@/lib/trip";
import type { Verdict } from "@/lib/engine/viability";

const SECTIONS = [
  { id: "savings", label: "Gas savings" },
  { id: "charging", label: "Charging" },
  { id: "emissions", label: "Emissions" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const VERDICT_LABEL: Record<Verdict, string> = {
  viable: "Viable",
  caveats: "Viable with caveats",
  not_yet: "Not yet",
};

const POWERTRAIN_LABEL: Record<RankedSwitch["powertrain"], string> = {
  gas: "Gasoline",
  hybrid: "Standard hybrid",
  phev: "Plug-in hybrid",
  bev: "Battery EV",
};

const PLACE = ["first", "second", "third"];

function paybackLabel(months: number): string {
  if (!Number.isFinite(months)) return "Fuel savings alone don't cover the payment increase";
  if (months <= 0) return "The payment is not higher than today";
  return `${Math.round(months)} months`;
}

function scoreSentence(option: RankedSwitch, rank: number, count: number): string {
  const weighted = Object.values(option.factors).reduce((sum, value) => sum + value, 0);
  const multiplier = viabilityMultiplier(option.verdict);
  const place = PLACE[rank - 1] ?? `number ${rank}`;
  const scaled =
    multiplier === 1
      ? "Viable keeps that total."
      : `${VERDICT_LABEL[option.verdict]} multiplies that total by ${multiplier}.`;
  return `${option.label} ranks ${place} of ${count}. The bars add to ${weighted.toFixed(2)}. ${scaled} The score is ${option.score.toFixed(2)}.`;
}

function factsFor(option: RankedSwitch): ExplainFacts {
  const direction = option.paymentDeltaCents < 0 ? "lower" : option.paymentDeltaCents > 0 ? "higher" : "same";
  const saved = option.monthlyEnergySavingCents * 12;
  return {
    title: option.label,
    monthly: formatDollars(option.paymentCents),
    monthlyDelta: formatDollars(Math.abs(option.paymentDeltaCents)),
    deltaDirection: direction,
    fuelSavings: saved === 0 ? "$0" : `${formatDollars(Math.abs(saved))} ${saved > 0 ? "less" : "more"}`,
    co2Avoided:
      option.co2AvoidedLbs === 0
        ? "0 lb"
        : `${Math.abs(Math.round(option.co2AvoidedLbs)).toLocaleString("en-US")} lb ${option.co2AvoidedLbs > 0 ? "less" : "more"}`,
    equity: formatDollars(Math.max(0, option.equityCents)),
    breakEven: Number.isFinite(option.paybackMonths) ? String(Math.round(option.paybackMonths)) : null,
    nextTitle: "the gas savings, charging, and emissions for this car",
    tailpipeNote: "The CO2 figure is tailpipe only.",
  };
}

/** Gemini may rephrase the winner. The score sentence is already on the page, so a missing reply changes nothing. */
function WrittenLine({ option, rank }: { option: RankedSwitch; rank: number }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (rank !== 1) {
      setText(null);
      return;
    }
    const controller = new AbortController();
    fetch("/api/explain", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factsFor(option)),
    })
      .then((response) => response.json())
      .then((body: { text?: string; source?: string }) => {
        if (!controller.signal.aborted && body.source === "llm" && body.text) setText(body.text);
      })
      .catch(() => undefined);
    return () => controller.abort();
    // The option object is rebuilt every render. The id is the car the score already picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.id, rank]);

  if (!text) return null;
  return <p className="mt-3 text-sm">{text}</p>;
}

export function SuggestionsPanel({ trip, result }: { trip: SavedTrip; result: SwitchResult }) {
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState<SectionId>("savings");
  const options = result.ranked;
  const option = options[index] ?? options[0];

  if (!option) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suggestions</h1>
        <p className="mt-3 text-sm">
          No next car cleared the budget. A payment more than 25% over budget is left out before anything is scored.
        </p>
      </div>
    );
  }

  const suggestion = { id: option.id, label: option.label, powertrain: option.powertrain };
  const priorities = trip.input.priorities.map((key) => PRIORITY_COPY[key]).join(", ");
  const rank = index + 1;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Suggestions</h1>
      <p className="mt-1 text-sm text-muted">
        Ranked from your priorities, then the viability multiplier. The score picks the car.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Suggested cars">
        {options.map((item, itemIndex) => {
          const selected = item.id === option.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                selected ? "border-jade bg-jade text-white" : "border-line bg-white text-ink"
              }`}
              onClick={() => setIndex(itemIndex)}
            >
              <span className="block font-medium">{item.label}</span>
              <span className={`block text-xs ${selected ? "text-white/80" : "text-muted"}`}>
                Ranked {itemIndex + 1} · {VERDICT_LABEL[item.verdict]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-jade-800">{POWERTRAIN_LABEL[option.powertrain]}</p>
      <h2 className="text-2xl font-semibold tracking-tight">
        {VERDICT_LABEL[option.verdict]} · {option.label}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Example payment</dt>
          <dd className="font-medium">{formatDollars(option.paymentCents)}/mo</dd>
        </div>
        <div>
          <dt className="text-muted">Fuel saved each year</dt>
          <dd className="font-medium">{formatDollars(option.monthlyEnergySavingCents * 12)}</dd>
        </div>
        <div>
          <dt className="text-muted">Payback</dt>
          <dd className="font-medium">{paybackLabel(option.paybackMonths)}</dd>
        </div>
      </dl>
      {option.negativeEquity ? (
        <p className="mt-3 text-sm">
          The trade is underwater by {formatDollars(Math.abs(option.equityCents))}. That shortfall is part of the next
          amount financed, and it is shown on its own.
        </p>
      ) : null}
      <details open className="mt-4 border border-line bg-white p-3">
        <summary className="text-sm font-medium">Why this score</summary>
        <p className="mt-3 text-sm">{scoreSentence(option, rank, options.length)}</p>
        <p className="mt-2 text-sm text-muted">Your priorities, highest first: {priorities || "none ranked"}.</p>
        <div className="mt-3">
          <ScoreBars factors={option.factors} />
        </div>
        <WrittenLine option={option} rank={rank} />
      </details>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={`${option.label} evidence`}>
        {SECTIONS.map((item) => {
          const selected = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                selected ? "bg-jade text-white" : "border border-line bg-white text-ink"
              }`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {section === "savings" ? <SavingsPanel trip={trip} suggestion={suggestion} /> : null}
        {section === "charging" ? <ChargingPanel trip={trip} suggestion={suggestion} /> : null}
        {section === "emissions" ? <ImpactPanel trip={trip} suggestion={suggestion} /> : null}
      </div>
      <p className="mt-4 text-sm text-muted">{COPY.noApproval}</p>
      <p className="mt-1 text-sm text-muted">Example — synthetic, not actual Toyota Financial Services pricing.</p>
    </div>
  );
}
