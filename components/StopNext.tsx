"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COPY, HORIZON_LABEL, PRIORITY_LABEL } from "@/config/copy";
import { PACKAGES, PAINTS, packageTotalCents } from "@/config/vehicles";
import { Assumptions } from "@/components/Assumptions";
import type { JourneyState } from "@/components/journey-state";
import { WhyChart } from "@/components/WhyChart";
import { explainTemplate, type ExplainFacts } from "@/lib/explain";
import { formatDollars, formatNumber, formatPounds } from "@/lib/format";
import type { Priority, Recommendation, ScoredMove } from "@/types";

export function StopNext({
  state,
  result,
  onPriority,
  onPaint,
  onPackages,
  onBack,
}: {
  state: JourneyState;
  result: Recommendation;
  onPriority: (priority: Priority) => void;
  onPaint: (paintId: string) => void;
  onPackages: (packageIds: string[]) => void;
  onBack: () => void;
}) {
  const headline = result.headline;
  const prose = useExplanation(headline);
  const paint = PAINTS.find((item) => item.id === state.paintId) ?? PAINTS[0];
  const build = (headline.replacement?.msrpCents ?? 0) + packageTotalCents(state.packageIds);

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Your next move</h1>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">What matters most</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="priority-live"
                className="accent-jade"
                checked={state.driving.priority === id}
                onChange={() => onPriority(id)}
              />
              {PRIORITY_LABEL[id]}
            </label>
          ))}
        </div>
      </fieldset>

      <article className="mt-6 border border-line p-4">
        <p className="text-sm font-medium text-jade-800">Recommended</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{headline.title}</h2>
        {headline.vehicleLabel ? (
          <p className="text-sm text-muted">{headline.vehicleLabel}</p>
        ) : null}
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
          {formatDollars(headline.monthlyPaymentCents)}
        </p>
        <p className="text-sm text-muted">
          {headline.id === "DEFER_PAYMENT" ? "due this month" : "a month"}
          {headline.monthlyDeltaCents !== 0
            ? `, ${formatDollars(Math.abs(headline.monthlyDeltaCents))} ${
                headline.monthlyDeltaCents < 0 ? "less" : "more"
              } than the current plan`
            : ""}
        </p>
        <p className="mt-3 text-sm">{prose}</p>
        {headline.breakEvenMonths !== null ? (
          <p className="mt-2 text-sm">
            {headline.breakEvenMonths === 0
              ? "The monthly payment is already lower, before counting fuel."
              : `Fuel savings cover the payment difference in ${headline.breakEvenMonths} months.`}
          </p>
        ) : null}
        {headline.tailpipeOnly ? <p className="mt-2 text-sm text-muted">{COPY.tailpipe}</p> : null}
      </article>

      {headline.replacement ? (
        <div className="mt-4 border border-line p-4">
          <h3 className="text-sm font-medium">Example build</h3>
          <p className="mt-1 text-sm text-muted">{COPY.exampleTerms} Paint does not change the price.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PAINTS.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                aria-label={swatch.name}
                onClick={() => onPaint(swatch.id)}
                className={`h-7 w-7 border ${swatch.id === paint.id ? "border-jade-800" : "border-line"}`}
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            {PACKAGES.map((item) => {
              const checked = state.packageIds.includes(item.id);
              return (
                <label key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-jade"
                      checked={checked}
                      onChange={() =>
                        onPackages(
                          checked
                            ? state.packageIds.filter((id) => id !== item.id)
                            : [...state.packageIds, item.id],
                        )
                      }
                    />
                    {item.name}
                  </span>
                  <span className="tabular-nums text-muted">{formatDollars(item.priceCents)}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-sm">
            Example build cost <span className="font-medium tabular-nums">{formatDollars(build)}</span>
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        {result.alternatives.map((move) => (
          <details key={`${move.id}-${move.variant ?? ""}`} className="border-t border-line py-3">
            <summary className="text-sm font-medium">{move.title}</summary>
            <MoveFacts move={move} />
          </details>
        ))}
        {result.showKeep ? (
          <details className="border-t border-line py-3">
            <summary className="text-sm font-medium">Do nothing — {result.keep.title}</summary>
            <MoveFacts move={result.keep} />
          </details>
        ) : null}
      </div>

      {result.comparisons.length > 0 ? (
        <div className="mt-6 border-t border-line pt-4">
          <h2 className="text-lg font-semibold tracking-tight">Powertrain comparison</h2>
          <p className="mt-1 text-sm text-muted">
            Same miles you entered. CO2 is the EPA tailpipe figure. Miles-not-driven uses this
            car’s own grams per mile.
          </p>
          <div className="mt-4 grid gap-4">
            {result.comparisons
              .filter((row) => row.role !== "trade")
              .map((row) => (
                <div key={row.role + row.label} className="border border-line p-3">
                  <h3 className="text-sm font-medium">{row.label}</h3>
                  {row.ruledOutReason ? (
                    <p className="mt-1 text-sm text-muted">Set aside. {row.ruledOutReason}</p>
                  ) : null}
                  <dl className="mt-2 grid grid-cols-3 gap-2">
                    <Mini label="Fuel / year" value={formatDollars(row.annualFuelCostCents)} />
                    <Mini label="CO2 avoided" value={formatPounds(row.annualCo2AvoidedLbs)} />
                    <Mini
                      label="Break-even"
                      value={
                        row.breakEvenMonths === null
                          ? "—"
                          : row.breakEvenMonths === 0
                            ? "Now"
                            : `${row.breakEvenMonths} mo`
                      }
                    />
                  </dl>
                  {row.equivalentMiles > 0 ? (
                    <p className="mt-2 text-sm text-muted">
                      About {formatNumber(row.equivalentMiles, 0)} miles of driving the current car.
                    </p>
                  ) : null}
                  {row.tailpipeOnly ? <p className="mt-1 text-sm text-muted">{COPY.tailpipe}</p> : null}
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 border border-line p-4">
        <h2 className="text-sm font-medium">{headline.next.title}</h2>
        <p className="mt-2 text-sm">{headline.next.body}</p>
        {headline.next.disclosure ? (
          <p className="mt-2 text-sm text-muted">{headline.next.disclosure}</p>
        ) : null}
        <Link
          href="/handoff"
          className="mt-4 inline-flex h-11 items-center rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
        >
          Download the one-page summary
        </Link>
      </div>

      <details className="mt-4 border-t border-line py-3" open>
        <summary className="text-sm font-medium">Why this</summary>
        <p className="mt-2 text-sm text-muted">
          Weights follow “{PRIORITY_LABEL[state.driving.priority]}”. Horizon is{" "}
          {HORIZON_LABEL[state.driving.horizon]}. Amber bars add to the score. The dark bar is a
          penalty.
        </p>
        <WhyChart contributions={headline.contributions} />
        {result.ruledOut.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm">
            {result.ruledOut.map((item) => (
              <li key={item.title}>
                <span className="font-medium">{item.title}.</span> {item.reason}
              </li>
            ))}
          </ul>
        ) : null}
        {state.driving.upcoming === "repair_needed" ? (
          <p className="mt-2 text-sm text-muted">{COPY.repairNote}</p>
        ) : null}
      </details>

      <Assumptions electricityCents={state.electricityRateCentsPerKwh} />

      <button type="button" className="mt-4 h-11 rounded-md border border-line px-4 text-sm" onClick={onBack}>
        Back
      </button>
    </section>
  );
}

function useExplanation(move: ScoredMove): string {
  const facts = factsFor(move);
  const template = explainTemplate(facts);
  const [text, setText] = useState(template);

  useEffect(() => {
    const nextTemplate = explainTemplate(facts);
    setText(nextTemplate);
    const controller = new AbortController();
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(facts),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { text?: string }) => {
        if (payload.text) setText(payload.text);
      })
      .catch(() => setText(nextTemplate));
    return () => controller.abort();
    // The facts object is rebuilt every render; the move fields are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    move.id,
    move.variant,
    move.monthlyPaymentCents,
    move.monthlyDeltaCents,
    move.annualFuelSavingsCents,
    move.annualCo2AvoidedLbs,
    move.equityAppliedCents,
    move.breakEvenMonths,
    move.next.title,
  ]);

  return text;
}

function factsFor(move: ScoredMove): ExplainFacts {
  const direction =
    move.monthlyDeltaCents < 0 ? "lower" : move.monthlyDeltaCents > 0 ? "higher" : "same";
  const fuel =
    move.annualFuelSavingsCents === 0
      ? "$0"
      : `${formatDollars(Math.abs(move.annualFuelSavingsCents))} ${
          move.annualFuelSavingsCents > 0 ? "less" : "more"
        }`;
  const co2 =
    move.annualCo2AvoidedLbs === 0
      ? "0 lb"
      : `${formatPounds(Math.abs(move.annualCo2AvoidedLbs))} ${
          move.annualCo2AvoidedLbs > 0 ? "less" : "more"
        }`;
  return {
    title: move.title,
    monthly: formatDollars(move.monthlyPaymentCents),
    monthlyDelta: formatDollars(Math.abs(move.monthlyDeltaCents)),
    deltaDirection: direction,
    fuelSavings: fuel,
    co2Avoided: co2,
    equity: formatDollars(move.equityAppliedCents),
    breakEven: move.breakEvenMonths === null ? null : String(move.breakEvenMonths),
    nextTitle: move.next.title,
    tailpipeNote: move.tailpipeOnly ? "The CO2 figure is tailpipe only." : null,
  };
}

function MoveFacts({ move }: { move: ScoredMove }) {
  return (
    <div className="mt-2 text-sm">
      <p>{move.summary}</p>
      <p className="mt-1 tabular-nums">{formatDollars(move.monthlyPaymentCents)} a month</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
