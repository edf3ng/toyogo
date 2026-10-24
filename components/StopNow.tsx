import { COPY } from "@/config/copy";
import { DollarInput, Field, SelectInput, TextInput } from "@/components/Field";
import { formatDollars } from "@/lib/format";
import { leaseMonthlyCents, monthlyPaymentCents, remainingBalanceCents } from "@/lib/engine/finance";
import type { JourneyState } from "@/components/journey-state";
import type { VehicleFacts } from "@/types";

export interface TrimOption {
  id: string;
  trim: string;
  baseModel: string;
  facts: VehicleFacts;
}

export function StopNow({
  state,
  years,
  models,
  trims,
  catalogNote,
  onChange,
  onYear,
  onModel,
  onTrim,
  onContinue,
}: {
  state: JourneyState;
  years: number[];
  models: string[];
  trims: TrimOption[];
  catalogNote: string;
  onChange: (patch: Partial<JourneyState>) => void;
  onYear: (year: number) => void;
  onModel: (model: string) => void;
  onTrim: (trim: TrimOption) => void;
  onContinue: () => void;
}) {
  const yearOptions = uniqueNumbers(state.year, years);
  const modelOptions = uniqueStrings(state.model, models);
  const trimOptions =
    state.vehicle && !trims.some((trim) => trim.id === state.vehicle?.id)
      ? [
          {
            id: state.vehicle.id,
            trim: state.vehicle.trim,
            baseModel: state.baseModel ?? state.model ?? "",
            facts: state.vehicle,
          },
          ...trims,
        ]
      : trims;
  const loanPayment =
    state.ownership === "loan"
      ? monthlyPaymentCents(state.loan.principalCents, state.loan.annualRate, state.loan.months)
      : 0;
  const loanPayoff =
    state.ownership === "loan"
      ? remainingBalanceCents(
          state.loan.principalCents,
          state.loan.annualRate,
          state.loan.months,
          state.loan.monthsElapsed,
        )
      : 0;
  const leasePayment = state.ownership === "lease" ? leaseMonthlyCents(state.lease) : 0;

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Where you are now</h1>
      <p className="mt-2 text-sm text-muted">
        Year, model, and trim come from FuelEconomy.gov, so only a real combination can be picked.
        {catalogNote ? ` ${catalogNote}` : ""}
      </p>

      <div className="mt-5 grid gap-4">
        <Field label="Year">
          <SelectInput
            value={state.year ?? ""}
            onChange={(event) => onYear(Number(event.target.value))}
          >
            <option value="" disabled>
              Choose a year
            </option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Model">
          <SelectInput
            value={state.model ?? ""}
            disabled={!state.year}
            onChange={(event) => onModel(event.target.value)}
          >
            <option value="" disabled>
              Choose a model
            </option>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Trim">
          <SelectInput
            value={state.vehicle?.id ?? ""}
            disabled={!state.model}
            onChange={(event) => {
              const trim = trimOptions.find((item) => item.id === event.target.value);
              if (trim) onTrim(trim);
            }}
          >
            <option value="" disabled>
              Choose a trim
            </option>
            {trimOptions.map((trim) => (
              <option key={trim.id} value={trim.id}>
                {trim.trim}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Odometer" hint="Used for the mileage adjustment on the value curve.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={200000}
              step={500}
              value={state.mileage}
              onChange={(event) => onChange({ mileage: Number(event.target.value) })}
              className="w-full"
            />
            <span className="w-24 shrink-0 text-right text-sm tabular-nums">
              {state.mileage.toLocaleString("en-US")} mi
            </span>
          </div>
        </Field>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Contract</legend>
        <div className="mt-2 grid gap-2">
          {(
            [
              ["owned", "Owned outright"],
              ["loan", "Loan"],
              ["lease", "Lease"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ownership"
                className="accent-jade"
                checked={state.ownership === value}
                onChange={() => onChange({ ownership: value })}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{COPY.exampleTerms}</p>
      </fieldset>

      {state.ownership === "loan" ? (
        <div className="mt-4 grid gap-4">
          <Field label="Amount financed">
            <DollarInput
              cents={state.loan.principalCents}
              onChange={(principalCents) =>
                onChange({ loan: { ...state.loan, principalCents } })
              }
            />
          </Field>
          <Field label="APR">
            <TextInput
              inputMode="decimal"
              value={String(Math.round(state.loan.annualRate * 1000) / 10)}
              onChange={(event) =>
                onChange({
                  loan: {
                    ...state.loan,
                    annualRate: Number(event.target.value.replace(/[^0-9.]/g, "")) / 100 || 0,
                  },
                })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Term, months">
              <TextInput
                inputMode="numeric"
                value={String(state.loan.months)}
                onChange={(event) =>
                  onChange({
                    loan: { ...state.loan, months: Number(event.target.value) || 0 },
                  })
                }
              />
            </Field>
            <Field label="Months paid">
              <TextInput
                inputMode="numeric"
                value={String(state.loan.monthsElapsed)}
                onChange={(event) =>
                  onChange({
                    loan: { ...state.loan, monthsElapsed: Number(event.target.value) || 0 },
                  })
                }
              />
            </Field>
          </div>
          <p className="text-sm">
            Payment {formatDollars(loanPayment)} a month. Payoff {formatDollars(loanPayoff)}.
          </p>
        </div>
      ) : null}

      {state.ownership === "lease" ? (
        <div className="mt-4 grid gap-4">
          <Field label="Cap cost">
            <DollarInput
              cents={state.lease.capCostCents}
              onChange={(capCostCents) => onChange({ lease: { ...state.lease, capCostCents } })}
            />
          </Field>
          <Field label="Residual">
            <DollarInput
              cents={state.lease.residualCents}
              onChange={(residualCents) => onChange({ lease: { ...state.lease, residualCents } })}
            />
          </Field>
          <Field label="Money factor" hint="Example factor, not a TFS rate.">
            <TextInput
              inputMode="decimal"
              value={String(state.lease.moneyFactor)}
              onChange={(event) =>
                onChange({
                  lease: {
                    ...state.lease,
                    moneyFactor: Number(event.target.value) || 0,
                  },
                })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Term, months">
              <TextInput
                inputMode="numeric"
                value={String(state.lease.months)}
                onChange={(event) =>
                  onChange({
                    lease: { ...state.lease, months: Number(event.target.value) || 0 },
                  })
                }
              />
            </Field>
            <Field label="Months elapsed">
              <TextInput
                inputMode="numeric"
                value={String(state.lease.monthsElapsed)}
                onChange={(event) =>
                  onChange({
                    lease: { ...state.lease, monthsElapsed: Number(event.target.value) || 0 },
                  })
                }
              />
            </Field>
          </div>
          <Field label="Payoff quote" hint="A published example quote. The engine does not invent this.">
            <DollarInput
              cents={state.lease.payoffCents}
              onChange={(payoffCents) => onChange({ lease: { ...state.lease, payoffCents } })}
            />
          </Field>
          <p className="text-sm">Payment {formatDollars(leasePayment)} a month.</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <Field
          label="Monthly payment you can live with"
          hint="A move above this is set aside and the reason is shown."
        >
          <DollarInput
            cents={state.driving.comfortablePaymentCents}
            onChange={(comfortablePaymentCents) =>
              onChange({ driving: { ...state.driving, comfortablePaymentCents } })
            }
          />
        </Field>
        <Field
          label="Cash you could put toward the car today"
          hint="Paying the loan off stays in the ranking only when this covers the payoff."
        >
          <DollarInput
            cents={state.driving.availableCashCents}
            onChange={(availableCashCents) =>
              onChange({ driving: { ...state.driving, availableCashCents } })
            }
          />
        </Field>
      </div>

      <button
        type="button"
        className="mt-6 h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800 disabled:bg-line disabled:text-muted"
        disabled={!state.vehicle}
        onClick={onContinue}
      >
        Continue
      </button>
    </section>
  );
}

function uniqueNumbers(current: number | null, values: number[]): number[] {
  const set = new Set(values);
  if (current) set.add(current);
  return [...set].sort((a, b) => b - a);
}

function uniqueStrings(current: string | null, values: string[]): string[] {
  const set = new Set(values);
  if (current) set.add(current);
  return [...set];
}
