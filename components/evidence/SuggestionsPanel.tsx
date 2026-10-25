"use client";

import { useEffect, useRef, useState } from "react";
import { PRIORITY_COPY } from "@/config/priorities";
import { Swap } from "@/components/appear";
import { ChargingPanel } from "@/components/evidence/ChargingPanel";
import { ImpactPanel } from "@/components/evidence/ImpactPanel";
import { SavingsPanel } from "@/components/evidence/SavingsPanel";
import { ScoreBars } from "@/components/ScoreBars";
import { formatDollars, formatNumber, formatPercent } from "@/lib/format";
import { switchWorth } from "@/lib/engine/energy";
import { ToyotaMark } from "@/components/ToyotaMark";
import { buyInventoryUrl } from "@/lib/shop";
import type { RankedSwitch, SwitchResult } from "@/lib/engine/switch";
import type { ExplainFacts } from "@/lib/explain";
import type { SavedTrip } from "@/lib/trip";

const SECTIONS = [
  { id: "savings", label: "Gas savings" },
  { id: "charging", label: "Charging" },
  { id: "emissions", label: "Emissions" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const POWERTRAIN_LABEL: Record<RankedSwitch["powertrain"], string> = {
  gas: "Gasoline",
  hybrid: "Standard hybrid",
  phev: "Plug-in hybrid",
  bev: "Battery EV",
};

const VERDICT_LABEL: Record<RankedSwitch["verdict"], string> = {
  viable: "Viable",
  caveats: "Caveats",
  not_yet: "Not yet",
};

const PLACE = ["first", "second", "third"];

function CarPicker({
  options,
  index,
  onChange,
}: {
  options: RankedSwitch[];
  index: number;
  onChange: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options[index];

  useEffect(() => {
    if (!open) return;
    function close(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onChange(Math.min(options.length - 1, index + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onChange(Math.max(0, index - 1));
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, index, options.length, onChange]);

  if (!current) return null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Suggested car"
        className="flex w-full items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5 text-left hover:border-jade"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-jade text-sm font-semibold text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{current.label}</span>
          <span className="block text-xs text-muted">
            {POWERTRAIN_LABEL[current.powertrain]} · {VERDICT_LABEL[current.verdict]}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Suggested cars"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-white shadow-lg"
        >
          {options.map((item, itemIndex) => {
            const selected = itemIndex === index;
            return (
              <li key={item.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                    selected ? "bg-paper" : "hover:bg-paper"
                  }`}
                  onClick={() => {
                    onChange(itemIndex);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                      selected ? "bg-jade text-white" : "border border-line text-ink"
                    }`}
                  >
                    {itemIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs text-muted">
                      {POWERTRAIN_LABEL[item.powertrain]} · {VERDICT_LABEL[item.verdict]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function paybackLabel(option: RankedSwitch): string {
  const worth = switchWorth(option);
  if (worth.extraMonthlyCents <= 0) return "The payment is not higher than today";
  if (option.monthlyEnergySavingCents <= 0) return "Fuel does not fall, so it does not offset the extra payment";
  if (worth.netMonthlyCents <= 0 && Number.isFinite(worth.paybackMonths)) {
    return `${Math.round(worth.paybackMonths)} months for fuel savings to cover the extra payment`;
  }
  if (worth.fuelCoversShare === null) return "Fuel savings alone don't cover the extra payment";
  return `Fuel covers ${formatPercent(worth.fuelCoversShare)} of each extra payment, so the extra payment does not pay back from fuel alone`;
}

function worthCopy(option: RankedSwitch): string {
  const worth = switchWorth(option);
  if (worth.extraMonthlyCents <= 0) {
    return `The example payment is not higher than today. Fuel still ${
      worth.annualFuelSaveCents >= 0 ? "saves" : "costs"
    } ${formatDollars(Math.abs(worth.annualFuelSaveCents))} a year.`;
  }
  if (worth.fuelCoversShare === null) {
    return `The extra payment is ${formatDollars(worth.extraMonthlyCents)}/mo.`;
  }
  const share = formatPercent(worth.fuelCoversShare);
  if (worth.netMonthlyCents <= 0) {
    return `Fuel saves ${formatDollars(option.monthlyEnergySavingCents)}/mo and more than covers the extra ${formatDollars(worth.extraMonthlyCents)}/mo payment. You are ${formatDollars(Math.abs(worth.netMonthlyCents))}/mo ahead after fuel. Over 5 years, fuel saves ${formatDollars(worth.fiveYearFuelCents)} against ${formatDollars(worth.fiveYearExtraCents)} of extra payments.`;
  }
  return `Fuel saves ${formatDollars(option.monthlyEnergySavingCents)}/mo, which is ${share} of the extra ${formatDollars(worth.extraMonthlyCents)}/mo payment. After fuel, the switch costs ${formatDollars(worth.netMonthlyCents)}/mo. Over 5 years, fuel saves ${formatDollars(worth.fiveYearFuelCents)} against ${formatDollars(worth.fiveYearExtraCents)} of extra payments.`;
}

function scoreSentence(option: RankedSwitch, rank: number, count: number): string {
  const weighted = Object.values(option.factors).reduce((sum, value) => sum + value, 0);
  const place = PLACE[rank - 1] ?? `number ${rank}`;
  return `${option.label} ranks ${place} of ${count}. The bars add to ${weighted.toFixed(2)}. The score is ${option.score.toFixed(2)}.`;
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

export function SuggestionsPanel({
  trip,
  result,
  onSelect,
}: {
  trip: SavedTrip;
  result: SwitchResult;
  onSelect?: (option: RankedSwitch | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState<SectionId>("savings");
  const options = result.ranked;
  const option = options[index] ?? options[0];

  useEffect(() => {
    if (option) onSelect?.(option);
    // The option object is rebuilt every render. The id is the selected car.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option?.id, onSelect]);

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
  const worth = switchWorth(option);

  return (
    <div>
      <CarPicker options={options} index={index} onChange={setIndex} />
      <Swap id={option.id}>
      <p className="mt-4 text-sm">
        <span className="text-jade-800">{POWERTRAIN_LABEL[option.powertrain]}</span>
        {" · "}
        <span>{VERDICT_LABEL[option.verdict]}</span>
        {" · "}
        <span className="text-muted">
          Ranked {rank} of {options.length}
        </span>
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{option.label}</h2>
      <a
        href={buyInventoryUrl(option.model, option.label, trip.zip)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2.5 hover:border-jade hover:bg-paper"
      >
        <span className="flex h-12 w-[4.75rem] shrink-0 items-center justify-center">
          <ToyotaMark className="h-11 w-[4.5rem] object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Find one to buy</span>
          <span className="block text-xs text-muted">
            Toyota inventory{trip.zip ? ` near ${trip.zip}` : ""}. Opens in a new tab.
          </span>
        </span>
        <span aria-hidden="true" className="text-jade-800">
          ↗
        </span>
      </a>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="border border-line bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Fuel if you switch</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {formatDollars(Math.abs(option.monthlyEnergySavingCents * 12))}
          </p>
          <p className="text-sm">
            {option.monthlyEnergySavingCents >= 0 ? "less each year" : "more each year"} than the{" "}
            {result.keep.year} {result.keep.model}
          </p>
        </div>
        <div className="border border-line bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Tailpipe if you switch</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {formatNumber(Math.max(0, Math.round(option.co2AvoidedLbs)))} lb
          </p>
          <p className="text-sm">
            {option.annualCo2Lbs === 0
              ? `down to 0, from ${formatNumber(Math.round(result.keep.annualCo2Lbs))} lb`
              : "less each year"}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border border-line bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Extra payment</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {formatDollars(Math.max(0, worth.extraMonthlyCents))}/mo
          </p>
          <p className="text-sm">above today to switch</p>
        </div>
        <div className="border border-line bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Fuel covers</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {worth.fuelCoversShare === null ? "—" : formatPercent(worth.fuelCoversShare)}
          </p>
          <p className="text-sm">
            of that extra payment
            {worth.extraMonthlyCents > 0 ? `, net ${formatDollars(worth.netMonthlyCents)}/mo after fuel` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">{worthCopy(option)}</p>
      <p className="mt-3 text-sm">
        <span className="text-muted">Payback from fuel savings. </span>
        {paybackLabel(option)}.
      </p>
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
        <Swap id={`${option.id}-${section}`}>
          {section === "savings" ? <SavingsPanel trip={trip} suggestion={suggestion} /> : null}
          {section === "charging" ? <ChargingPanel trip={trip} suggestion={suggestion} /> : null}
          {section === "emissions" ? <ImpactPanel trip={trip} suggestion={suggestion} /> : null}
        </Swap>
      </div>
      </Swap>
    </div>
  );
}
