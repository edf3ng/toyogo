"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRIORITY_COPY, PRIORITY_KEYS, type PriorityKey } from "@/config/priorities";
import { PAINTS } from "@/config/vehicles";
import { DRIVERS } from "@/data/drivers";
import { Field, SelectInput, TextInput } from "@/components/Field";
import type { ChargeAccess } from "@/lib/engine/energy";
import { buildTrip, GARAGE, tripFromDriver, writeTrip } from "@/lib/trip";

const STEPS = ["Where you drive", "The Toyota", "How it's paid for", "What matters"] as const;

export function SignupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [zip, setZip] = useState("78704");
  const [carId, setCarId] = useState(GARAGE[0].id);
  const [miles, setMiles] = useState("68000");
  const [paint, setPaint] = useState(PAINTS[4].hex);
  const [vin, setVin] = useState("");
  const [finance, setFinance] = useState<"owned" | "loan" | "lease">("owned");
  const [elapsed, setElapsed] = useState("38");
  const [budget, setBudget] = useState("900");
  const [charge, setCharge] = useState<ChargeAccess>("yes");
  const [daily, setDaily] = useState("22");
  const [priorities, setPriorities] = useState<PriorityKey[]>([...PRIORITY_KEYS]);
  const [other, setOther] = useState("");

  const car = GARAGE.find((item) => item.id === carId) ?? GARAGE[0];

  function loadDriver(id: "alex" | "blair" | "casey") {
    const trip = tripFromDriver(id);
    const match = GARAGE.find((item) => item.id === trip.input.current.id) ?? GARAGE[0];
    setZip(trip.zip);
    setCarId(match.id);
    setMiles(String(trip.input.current.miles));
    setFinance(trip.input.contract.kind);
    setElapsed(
      trip.input.contract.kind === "owned" ? "0" : String(trip.input.contract.monthsElapsed),
    );
    setBudget(String(Math.round(trip.input.budgetCents / 100)));
    setCharge(trip.input.chargeAccess);
    setDaily(String(trip.input.dailyMiles));
    setPriorities([...trip.input.priorities]);
    setOther("");
    setVin("");
    writeTrip({ ...trip, paint });
    router.push("/dashboard");
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...priorities];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setPriorities(next);
  }

  function finish() {
    const saved = buildTrip({
      name: "Driver",
      zip: zip.trim(),
      car,
      miles: Number(miles) || 0,
      finance,
      monthsElapsed: Number(elapsed) || 0,
      budgetCents: Math.round((Number(budget) || 0) * 100),
      charge,
      dailyMiles: Number(daily) || 0,
      priorities,
      paint,
      other,
    });
    setVin("");
    writeTrip(saved);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm text-muted">
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{STEPS[step]}</h1>

      {step === 0 ? (
        <div className="mt-5 grid gap-4">
          <Field label="ZIP code" hint="Austin is 78704. A rural Texas ZIP such as 76825 has few chargers in this demo.">
            <TextInput
              inputMode="numeric"
              autoComplete="postal-code"
              value={zip}
              onChange={(event) => setZip(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {DRIVERS.map((driver) => (
              <button
                key={driver.id}
                type="button"
                className="h-11 rounded-md border border-line px-3 text-sm"
                onClick={() => loadDriver(driver.id)}
              >
                Open {driver.name}&apos;s verdict
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">
            Those three are synthetic drivers. The same scoring runs for each of them.
          </p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-5 grid gap-4">
          <Field label="Toyota">
            <SelectInput value={carId} onChange={(event) => setCarId(event.target.value)}>
              {GARAGE.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Mileage">
            <TextInput inputMode="numeric" value={miles} onChange={(event) => setMiles(event.target.value)} />
          </Field>
          <Field label="Paint">
            <div className="flex flex-wrap gap-2">
              {PAINTS.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={() => setPaint(swatch.hex)}
                  className={`h-8 w-8 border ${paint === swatch.hex ? "border-jade-800" : "border-line"}`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          </Field>
          <Field
            label="VIN, optional"
            hint="If you type one, it stays on this step only. It is not saved and it is not sent."
          >
            <TextInput
              value={vin}
              autoComplete="off"
              onChange={(event) => setVin(event.target.value.toUpperCase())}
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <fieldset className="mt-5 grid gap-3">
          <legend className="text-sm font-medium">Ownership</legend>
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
                name="finance"
                checked={finance === value}
                onChange={() => setFinance(value)}
              />
              {label}
            </label>
          ))}
          {finance !== "owned" ? (
            <Field
              label="Months already paid"
              hint="The loan example uses the car's example price at 4.9% for 60 months. The lease payoff is an example too."
            >
              <TextInput inputMode="numeric" value={elapsed} onChange={(event) => setElapsed(event.target.value)} />
            </Field>
          ) : null}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <div className="mt-5 grid gap-4">
          <Field label="Monthly budget, dollars" hint="A payment more than 25% over this is set aside.">
            <TextInput inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} />
          </Field>
          <Field label="Home charging">
            <SelectInput value={charge} onChange={(event) => setCharge(event.target.value as ChargeAccess)}>
              <option value="yes">Yes, I can charge at home</option>
              <option value="maybe">I could install a charger</option>
              <option value="no">No</option>
              <option value="unsure">Not sure</option>
            </SelectInput>
          </Field>
          <Field label="Miles on a typical day">
            <TextInput inputMode="numeric" value={daily} onChange={(event) => setDaily(event.target.value)} />
          </Field>
          <div>
            <p className="text-sm font-medium">Rank what matters. First is weighted most.</p>
            <ol className="mt-2 grid gap-2">
              {priorities.map((key, index) => (
                <li key={key} className="flex items-center justify-between gap-3 border border-line bg-white px-3 py-2">
                  <span className="text-sm">
                    {index + 1}. {PRIORITY_COPY[key]}
                  </span>
                  <span className="flex gap-2">
                    <button type="button" className="text-sm text-jade-800" onClick={() => move(index, -1)}>
                      Up
                    </button>
                    <button type="button" className="text-sm text-jade-800" onClick={() => move(index, 1)}>
                      Down
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <Field label="Anything else" hint="This is shown on the verdict. It is not part of the score.">
            <TextInput value={other} onChange={(event) => setOther(event.target.value)} />
          </Field>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            className="h-11 rounded-md border border-line px-4 text-sm"
            onClick={() => {
              setVin("");
              setStep((current) => current - 1);
            }}
          >
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
            onClick={() => {
              setVin("");
              setStep((current) => current + 1);
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
            onClick={finish}
          >
            See the verdict
          </button>
        )}
      </div>
    </div>
  );
}
