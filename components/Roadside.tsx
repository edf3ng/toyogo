"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COPY } from "@/config/copy";
import { FINANCING } from "@/config/financing";
import { ChargingPanel } from "@/components/evidence/ChargingPanel";
import { ImpactPanel } from "@/components/evidence/ImpactPanel";
import { SavingsPanel } from "@/components/evidence/SavingsPanel";
import { TradeInPanel } from "@/components/evidence/TradeInPanel";
import { AdvicePending, SuggestionChoices, useVehicleAdvice } from "@/components/evidence/NextVehicle";
import { HomeCar } from "@/components/HomeCar";
import { formatDollars, formatPercent } from "@/lib/format";
import { matchPick } from "@/lib/advice";
import { CANDIDATES, recommendSwitch, type RankedSwitch } from "@/lib/engine/switch";
import type { Verdict } from "@/lib/engine/viability";
import { readTrip, type SavedTrip } from "@/lib/trip";
import { ACCOUNT_CHANGED } from "@/lib/account";

const TABS = [
  { id: "trade-in", label: "Trade-in" },
  { id: "savings", label: "Gas savings" },
  { id: "charging", label: "Charging" },
  { id: "emissions", label: "Emissions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const VERDICT_LABEL: Record<Verdict, string> = {
  viable: "Viable",
  caveats: "Viable with caveats",
  not_yet: "Not yet",
};

const POWERTRAIN_LABEL: Record<RankedSwitch["powertrain"], string> = {
  gas: "Keep the gasoline car",
  hybrid: "Standard hybrid",
  phev: "Plug-in hybrid",
  bev: "Battery EV",
};

function isTab(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

function paybackLabel(months: number): string {
  if (!Number.isFinite(months)) return "Fuel savings alone don't cover the payment increase";
  if (months <= 0) return "The payment is not higher than today";
  return `${Math.round(months)} months`;
}

function hero(option: RankedSwitch): { value: string; caption: string } {
  if (option.powertrain === "phev") {
    return {
      value: `${Math.round(option.electricShare * 100)}%`,
      caption: "of these miles can run on a charge. The rest stay on petrol.",
    };
  }
  const annual = option.monthlyEnergySavingCents * 12;
  if (option.powertrain === "hybrid") {
    return { value: formatDollars(annual), caption: "a year in fuel. A standard hybrid does not plug in." };
  }
  return {
    value: formatDollars(annual),
    caption: "a year in energy cost compared with keeping this car. Tailpipe CO2 on a battery EV is 0.",
  };
}

function WhyDrawer({
  option,
  assumptions,
}: {
  option: RankedSwitch;
  assumptions: ReturnType<typeof recommendSwitch>["assumptions"];
}) {
  const rows = [
    ["Charging", "charging", option.gates.charging],
    ["Daily drive", "daily", option.gates.daily],
    ["Budget", "budget", option.gates.budget],
    ["Equity", "equity", option.gates.equity],
    ["Payback", "payback", option.gates.payback],
  ] as const;
  return (
    <details className="mt-4 border border-line bg-white p-3">
      <summary className="text-sm font-medium">Why this?</summary>
      <ul className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="font-medium">
              {value === null ? "Not applicable" : value.toFixed(2)}
              {option.verdict !== "viable" && option.limiting === key ? " · limiting" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        {assumptions.drivingDays} driving days a year. Gas at $
        {assumptions.gasDollarsPerGallon.toFixed(2)} a gallon until the savings tab loads a fresher price.
        Electricity at {assumptions.electricityCentsPerKwh}¢ per kWh, a state average. Example tax treatment
        — varies by state — {(FINANCING.salesTaxRate * 100).toFixed(2)}% after the trade-in. Example rate{" "}
        {formatPercent(assumptions.apr)} for {assumptions.termMonths} months. {COPY.modelledValue}
      </p>
    </details>
  );
}

export function Roadside() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: TabId = isTab(requested) ? requested : "trade-in";
  const [trip, setTrip] = useState<SavedTrip | null | undefined>(undefined);
  const { advice, chosen, setChosen, pick } = useVehicleAdvice(trip ? trip.input : null);

  useEffect(() => {
    const sync = () => setTrip(readTrip());
    sync();
    window.addEventListener(ACCOUNT_CHANGED, sync);
    return () => window.removeEventListener(ACCOUNT_CHANGED, sync);
  }, []);

  const scored = trip ? recommendSwitch({ ...trip.input, candidates: CANDIDATES }) : null;
  const matched = pick && scored ? matchPick(pick, [...scored.ranked, ...scored.aboveBudget]) : undefined;
  const suggestion = pick
    ? {
        id: matched?.id ?? null,
        label: matched?.label ?? `${pick.year} ${pick.model}`,
        powertrain: matched?.powertrain ?? pick.powertrain,
      }
    : null;

  return (
    <section className="grid h-dvh grid-rows-[minmax(16rem,42vh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.9fr)] lg:grid-rows-1">
      <div className="relative min-h-0 overflow-hidden bg-white">
        <HomeCar paint={trip?.paint} />
      </div>
      <aside className="flex min-h-0 flex-col overflow-hidden border-l border-line bg-paper">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-16 pb-6 lg:px-5">
          {trip === undefined ? <p className="text-sm text-muted">Loading the recommendation.</p> : null}
          {trip === null ? (
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
          ) : null}
          {trip && advice === "loading" ? <AdvicePending /> : null}
          {trip && advice === "none" ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">No suggestion yet</h1>
              <p className="mt-3 text-sm">Gemini did not choose a next car, so nothing is recommended for this one.</p>
            </div>
          ) : null}
          {trip && suggestion && pick && typeof advice === "object" ? (
            <>
              <SuggestionChoices advice={advice} chosen={chosen} onChoose={setChosen} />
              {matched ? (
                <>
                  <p className="mt-5 text-sm text-jade-800">{POWERTRAIN_LABEL[matched.powertrain]}</p>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {VERDICT_LABEL[matched.verdict]} · {matched.label}
                  </h1>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{hero(matched).value}</p>
                  <p className="mt-1 text-sm text-muted">{hero(matched).caption}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">Example payment</dt>
                      <dd className="font-medium">{formatDollars(matched.paymentCents)}/mo</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Fuel saved each year</dt>
                      <dd className="font-medium">{formatDollars(matched.monthlyEnergySavingCents * 12)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Payback</dt>
                      <dd className="font-medium">{paybackLabel(matched.paybackMonths)}</dd>
                    </div>
                  </dl>
                  {matched.negativeEquity ? (
                    <p className="mt-3 text-sm">
                      The trade is underwater by {formatDollars(Math.abs(matched.equityCents))}. That shortfall is part of
                      the next amount financed, and it is shown on its own.
                    </p>
                  ) : null}
                </>
              ) : (
                <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                  {pick.year} {pick.model}
                </h1>
              )}
              {trip.other ? (
                <p className="mt-3 text-sm">You also wrote: “{trip.other}”. That note is not in the score.</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Evidence">
                {TABS.map((item) => {
                  const active = item.id === tab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`tab-${item.id}`}
                      aria-selected={active}
                      aria-controls={`panel-${item.id}`}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        active ? "bg-jade text-white" : "border border-line bg-white text-ink"
                      }`}
                      onClick={() => router.replace(`/dashboard?tab=${item.id}`, { scroll: false })}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "trade-in" ? <TradeInPanel trip={trip} /> : null}
                {tab === "savings" ? <SavingsPanel trip={trip} suggestion={suggestion} /> : null}
                {tab === "charging" ? <ChargingPanel trip={trip} suggestion={suggestion} /> : null}
                {tab === "emissions" ? <ImpactPanel trip={trip} suggestion={suggestion} /> : null}
              </div>
              {matched && scored ? <WhyDrawer option={matched} assumptions={scored.assumptions} /> : null}
              <p className="mt-4 text-sm text-muted">{COPY.noApproval}</p>
              <p className="mt-1 text-sm text-muted">Example — synthetic, not actual Toyota Financial Services pricing.</p>
            </>
          ) : null}
          <footer className="mt-6 border-t border-line pt-3 text-xs text-muted">
            <p>{COPY.footer}</p>
            <p className="mt-1">{COPY.modelCredit}</p>
          </footer>
        </div>
      </aside>
    </section>
  );
}
