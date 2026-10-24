"use client";

import { useEffect, useMemo, useState } from "react";
import { FALLBACK_FUEL_PRICES, FUEL } from "@/config/fuel";
import { PERSONAS, analysisFor, personaById } from "@/data/personas";
import { Stepper } from "@/components/Stepper";
import { StopDrive } from "@/components/StopDrive";
import { StopNext } from "@/components/StopNext";
import { StopNow, type TrimOption } from "@/components/StopNow";
import { StopToday } from "@/components/StopToday";
import { HANDOFF_KEY, type HandoffSnapshot } from "@/lib/handoff";
import { toAnalysis, type JourneyState } from "@/components/journey-state";
import { recommend } from "@/lib/engine/recommend";
import { formatDollars } from "@/lib/format";
import type { FuelPrices, LeaseContract, LoanContract, Priority, ReplacementVehicle } from "@/types";

const defaultLoan: LoanContract = {
  kind: "loan",
  principalCents: 2_000_000,
  annualRate: 0.069,
  months: 60,
  monthsElapsed: 12,
};

const defaultLease: LeaseContract = {
  kind: "lease",
  capCostCents: 2_350_000,
  residualCents: 1_410_000,
  moneyFactor: 0.0018,
  months: 36,
  monthsElapsed: 12,
  payoffCents: 1_800_000,
};

function fromPersona(id: string, step: JourneyState["step"]): JourneyState {
  const persona = personaById(id) ?? PERSONAS[0];
  const input = analysisFor(persona);
  const contract = input.contract;
  return {
    step,
    personaId: persona.id,
    year: input.current.year,
    model: input.current.model,
    baseModel: input.current.model,
    vehicle: input.current,
    replacements: input.replacements,
    mileage: input.mileage,
    ownership: contract.kind,
    loan: contract.kind === "loan" ? contract : defaultLoan,
    lease: contract.kind === "lease" ? contract : defaultLease,
    driving: input.driving,
    paintId: "blueprint",
    packageIds: [],
    fuelPrices: input.fuelPrices,
    electricityRateCentsPerKwh: input.electricityRateCentsPerKwh,
  };
}

function blank(): JourneyState {
  return {
    ...fromPersona("elena", 1),
    step: 1,
    personaId: null,
    year: null,
    model: null,
    baseModel: null,
    vehicle: null,
    replacements: [],
    mileage: 36_000,
    ownership: "owned",
    driving: {
      annualMiles: 12_000,
      mix: "mix",
      horizon: "1_to_3",
      priority: "lowest_payment",
      upcoming: "none",
      comfortablePaymentCents: 80_000,
      availableCashCents: 0,
    },
  };
}

export function Journey() {
  const [state, setState] = useState<JourneyState>(() => fromPersona("elena", 1));
  const [question, setQuestion] = useState(0);
  const [years, setYears] = useState<number[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<TrimOption[]>([]);
  const [catalogNote, setCatalogNote] = useState("");

  const analysis = useMemo(() => toAnalysis(state), [state]);
  const result = useMemo(() => {
    if (!analysis) return null;
    try {
      return recommend(analysis);
    } catch {
      return null;
    }
  }, [analysis]);

  useEffect(() => {
    if (!result || !state.vehicle) return;
    const who = personaById(state.personaId)?.name ?? personaById(state.personaId)?.title ?? "Custom";
    const contractLine =
      state.ownership === "owned"
        ? "Owned outright"
        : state.ownership === "loan"
          ? `Loan, ${formatDollars(result.currentMonthlyCents)} a month, payoff ${formatDollars(result.payoffCents)}`
          : `Lease, ${formatDollars(result.currentMonthlyCents)} a month, payoff quote ${formatDollars(result.payoffCents)}`;
    const snapshot: HandoffSnapshot = {
      who,
      vehicleLine: `${state.vehicle.year} ${state.vehicle.model} — ${state.vehicle.trim}`,
      mileage: state.mileage,
      contractLine,
      driving: state.driving,
      result,
    };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(snapshot));
  }, [result, state]);

  useEffect(() => {
    let cancel = false;
    fetch("/api/fuelprices")
      .then((response) => response.json())
      .then((payload: { prices?: FuelPrices; electricityRateCents?: number; source?: string }) => {
        if (cancel || !payload.prices) return;
        setState((current) => ({
          ...current,
          fuelPrices: payload.prices ?? FALLBACK_FUEL_PRICES,
          electricityRateCentsPerKwh:
            payload.electricityRateCents ?? FUEL.electricityRateCentsPerKwh,
        }));
        if (payload.source === "cache") setCatalogNote("Using the saved fuel-price catalog.");
      })
      .catch(() => undefined);
    fetch("/api/vehicles")
      .then((response) => response.json())
      .then((payload: { years?: number[]; source?: string }) => {
        if (cancel) return;
        setYears(payload.years ?? []);
        if (payload.source === "cache") setCatalogNote("Using the saved FuelEconomy.gov catalog.");
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!state.year) return;
    let cancel = false;
    fetch(`/api/vehicles?year=${state.year}`)
      .then((response) => response.json())
      .then((payload: { models?: string[] }) => {
        if (!cancel) setModels(payload.models ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [state.year]);

  useEffect(() => {
    if (!state.year || !state.model) return;
    let cancel = false;
    fetch(`/api/vehicles?year=${state.year}&model=${encodeURIComponent(state.model)}`)
      .then((response) => response.json())
      .then((payload: { trims?: TrimOption[] }) => {
        if (!cancel) setTrims(payload.trims ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [state.year, state.model]);

  function patch(next: Partial<JourneyState>) {
    setState((current) => ({ ...current, ...next }));
  }

  async function chooseTrim(trim: TrimOption) {
    setState((current) => ({
      ...current,
      personaId: null,
      vehicle: trim.facts,
      model: trim.facts.model,
      baseModel: trim.baseModel,
      replacements: [],
    }));
    const response = await fetch(
      `/api/vehicles?upgrades=1&model=${encodeURIComponent(trim.facts.model)}&baseModel=${encodeURIComponent(trim.baseModel)}`,
    );
    const payload = (await response.json()) as { replacements?: ReplacementVehicle[] };
    setState((current) =>
      current.vehicle?.id === trim.id
        ? { ...current, replacements: payload.replacements ?? [] }
        : current,
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Scenario</span>
          <select
            className="h-10 w-full rounded-md border border-line bg-white px-2 text-sm sm:w-auto"
            value={state.personaId ?? "custom"}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "custom") {
                setState(blank());
                setQuestion(0);
                return;
              }
              setState((current) => fromPersona(value, current.step));
              setQuestion(0);
            }}
          >
            {PERSONAS.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name ? `${persona.name} — ${persona.title}` : persona.title}
              </option>
            ))}
            <option value="custom">Build your own</option>
          </select>
        </label>
        <p className="mt-1 text-sm text-muted">
          {personaById(state.personaId)?.blurb ?? "Pick a real Toyota from the catalog."}
        </p>
      </div>
      <Stepper
        step={state.step}
        onJump={(step) => {
          if (step < state.step) patch({ step });
        }}
      />
      {state.step === 1 ? (
        <StopNow
          state={state}
          years={years}
          models={models}
          trims={trims}
          catalogNote={catalogNote}
          onChange={patch}
          onYear={(year) =>
            patch({
              personaId: null,
              year,
              model: null,
              vehicle: null,
              baseModel: null,
              replacements: [],
            })
          }
          onModel={(model) =>
            patch({ personaId: null, model, vehicle: null, baseModel: null, replacements: [] })
          }
          onTrim={(trim) => void chooseTrim(trim)}
          onContinue={() => patch({ step: 2 })}
        />
      ) : null}
      {state.step === 2 ? (
        <StopDrive
          state={state}
          question={question}
          onQuestion={setQuestion}
          onChange={patch}
          onBack={() => patch({ step: 1 })}
          onContinue={() => patch({ step: 3 })}
        />
      ) : null}
      {state.step === 3 && result ? (
        <StopToday
          state={state}
          result={result}
          onPaint={(paintId) => patch({ paintId })}
          onBack={() => patch({ step: 2 })}
          onContinue={() => patch({ step: 4 })}
        />
      ) : null}
      {state.step >= 3 && !result ? (
        <p className="text-sm">
          Those contract numbers do not produce a payment yet. Check the term and the months already
          paid.
        </p>
      ) : null}
      {state.step === 4 && result ? (
        <StopNext
          state={state}
          result={result}
          onPriority={(priority: Priority) => patch({ driving: { ...state.driving, priority } })}
          onPaint={(paintId) => patch({ paintId })}
          onPackages={(packageIds) => patch({ packageIds })}
          onBack={() => patch({ step: 3 })}
        />
      ) : null}
    </div>
  );
}
