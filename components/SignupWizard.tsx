"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Reorder } from "framer-motion";
import { PRIORITY_COPY, PRIORITY_KEYS, type PriorityKey } from "@/config/priorities";
import { PAINTS } from "@/config/vehicles";
import { Stagger } from "@/components/appear";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { Landmark } from "@/components/Landmark";
import { loadAccount, saveAccount } from "@/lib/account";
import { monthlyPaymentCents, remainingBalanceCents } from "@/lib/engine/finance";
import { ownershipAgeYears, valueVehicle } from "@/lib/engine/valuation";
import { formatDollars } from "@/lib/format";
import { garageCar, garageMsrpCents, garageYears, modelsForYear } from "@/lib/garage";
import type { ChargeAccess } from "@/lib/engine/energy";
import { buildTrip } from "@/lib/trip";

const STOPS = [
  { kicker: "Stop 1", marker: "New York", title: "Your account", image: { src: "/images/nyc.png", alt: "Illustration of New York City" } },
  { kicker: "Stop 2", marker: "Chicago", title: "Where you drive", image: { src: "/images/chicago.png", alt: "Illustration of the Chicago skyline" } },
  { kicker: "Stop 3", marker: "Mt. Rushmore", title: "Your Toyota", image: { src: "/images/mtrushmore.png", alt: "Illustration of Mount Rushmore" } },
  { kicker: "Stop 4", marker: "Grand Canyon", title: "How you paid", image: { src: "/images/grandcanyon.png", alt: "Illustration of the Grand Canyon" } },
  { kicker: "Stop 5", marker: "Golden Gate Bridge", title: "What matters", image: { src: "/images/goldengate.png", alt: "Illustration of the Golden Gate Bridge" } },
] as const;

const ISSUE_OPTIONS = [
  { id: "accident", label: "Accident history" },
  { id: "tires", label: "Tires need replacing" },
  { id: "brakes", label: "Brakes need work" },
  { id: "warning", label: "Warning light on" },
] as const;

function dollars(raw: string): number {
  const value = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function rate(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0.049;
  return value > 1 ? value / 100 : value;
}

function scrollSignupToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function SignupWizard() {
  const router = useRouter();
  const years = garageYears();
  const first = modelsForYear(2019).find((row) => row.model === "Corolla") ?? modelsForYear(years[0])[0];
  const [step, setStep] = useState(0);
  const [customizing, setCustomizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("Toyogo@gmail.com");
  const [username, setUsername] = useState("Toyogo123");
  const [password, setPassword] = useState("Toyoyo");
  const [zip, setZip] = useState("78704");
  const [charge, setCharge] = useState<ChargeAccess>("yes");
  const [year, setYear] = useState(first.year);
  const [carId, setCarId] = useState(first.id);
  const [miles, setMiles] = useState("40000");
  const [paint, setPaint] = useState(PAINTS[4].hex);
  const [vin, setVin] = useState("");
  const [finance, setFinance] = useState<"owned" | "loan" | "lease">("owned");
  const [acquired, setAcquired] = useState<"new" | "cpo" | "used">("used");
  const [purchasedOn, setPurchasedOn] = useState("2020-06");
  const [issues, setIssues] = useState<string[]>([]);
  const [principal, setPrincipal] = useState("28000");
  const [startedOn, setStartedOn] = useState("2022-01");
  const [apr, setApr] = useState("4.9");
  const [term, setTerm] = useState("60");
  const [remaining, setRemaining] = useState("22");
  const [payment, setPayment] = useState("");
  const [payoff, setPayoff] = useState("");
  const [agreementName, setAgreementName] = useState("");
  const [budget, setBudget] = useState("700");
  const [daily, setDaily] = useState("30");
  const [priorities, setPriorities] = useState<PriorityKey[]>([...PRIORITY_KEYS]);
  const [other, setOther] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      const account = await loadAccount(controller.signal);
      if (controller.signal.aborted || !account) return;
      const { driver, trip: saved } = account;
      setEmail(driver.email);
      setUsername(driver.name);
      const { input, signupValues: values } = saved;
      const contract = input.contract;
      setCustomizing(true);
      setPassword("");
      setZip(saved.zip);
      setCharge(input.chargeAccess);
      setYear(input.current.year);
      setCarId(input.current.id);
      setMiles(values?.miles ?? String(input.current.miles));
      setPaint(saved.paint);
      setFinance(contract.kind);
      setAcquired(values?.acquired ?? saved.acquired ?? "used");
      if (values) {
        setPurchasedOn(values.purchasedOn);
        setStartedOn(values.startedOn);
        setPrincipal(values.principal);
        setApr(values.apr);
        setTerm(values.term);
        setRemaining(values.remaining);
        setPayment(values.payment);
        setPayoff(values.payoff);
      } else {
        if (contract.kind === "owned") {
          setPurchasedOn(saved.purchasedOn);
        } else {
          setStartedOn(saved.purchasedOn);
          setTerm(String(contract.months));
          setRemaining(String(Math.max(0, contract.months - contract.monthsElapsed)));
          if (contract.kind === "loan") {
            setPrincipal(String(contract.principalCents / 100));
            setApr(String(Number((contract.annualRate * 100).toFixed(6))));
          } else {
            setPrincipal(String(contract.capCostCents / 100));
            setApr(String(Number((contract.moneyFactor * 24 * 100).toFixed(6))));
            setPayoff(String(contract.payoffCents / 100));
          }
        }
        setPayment(input.statedPaymentCents === undefined ? "" : String(input.statedPaymentCents / 100));
      }
      setIssues([...(input.issues ?? [])]);
      setAgreementName(saved.agreementName);
      setBudget(values?.budget ?? String(input.budgetCents / 100));
      setDaily(values?.daily ?? String(input.dailyMiles));
      setPriorities([...input.priorities]);
      setOther(saved.other);
    }
    restore().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setLoadFailed(true);
      setError(error instanceof Error ? error.message : "Could not load your account.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    scrollSignupToTop();
  }, [step]);

  const models = modelsForYear(year);
  const car = models.find((row) => row.id === carId) ?? models[0] ?? garageCar(carId);

  const preview = useMemo(() => {
    const msrp = garageMsrpCents(car.model);
    const value = valueVehicle(
      msrp,
      ownershipAgeYears(car.year, "2026-10-24", null),
      Number(miles) || 0,
      issues,
    );
    const months = Number(term) || 0;
    const left = Number(remaining) || 0;
    const elapsed = Math.max(0, Math.min(months, months - left));
    const annual = rate(apr);
    const principalCents = dollars(principal) || msrp;
    const balance =
      finance === "loan"
        ? remainingBalanceCents(principalCents, annual, months, elapsed)
        : finance === "lease"
          ? dollars(payoff)
          : 0;
    const computedPayment =
      finance === "loan" ? monthlyPaymentCents(principalCents, annual, months) : 0;
    return { value, balance, computedPayment, elapsed };
  }, [apr, car.model, car.year, finance, issues, miles, payoff, principal, remaining, term]);

  function showStep(next: number) {
    setVin("");
    setStep(next);
  }

  function movePriority(index: number, direction: -1 | 1) {
    setPriorities((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function toggleIssue(id: string) {
    setIssues((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const months = Number(term) || 60;
      const left = Number(remaining) || 0;
      const saved = buildTrip({
        name: username.trim(),
        zip: zip.trim(),
        car,
        miles: Number(miles) || 0,
        finance,
        monthsElapsed: Math.max(0, months - left),
        loanMonths: months,
        apr: rate(apr),
        principalCents: dollars(principal),
        payoffCents: dollars(payoff),
        statedPaymentCents: dollars(payment),
        budgetCents: dollars(budget),
        charge,
        dailyMiles: Number(daily) || 0,
        priorities,
        paint,
        other,
        issues,
        acquired: finance === "owned" ? acquired : null,
        purchasedOn: finance === "owned" ? purchasedOn : startedOn,
        agreementName,
      });
      const trip = {
        ...saved,
        signupValues: {
          miles, principal, startedOn, apr, term, remaining, payment, payoff,
          budget, daily, acquired, purchasedOn,
        },
      };
      await saveAccount({ email, username, password, trip }, customizing);
      setVin("");
      setPassword("");
      router.push("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your account. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stop = STOPS[step];

  return (
    <Landmark
      marker={stop.marker}
      kicker={stop.kicker}
      title={stop.title}
      image={stop.image}
      sceneKey={`${stop.marker}-${loading || loadFailed ? "wait" : "form"}`}
    >
      <p className="mt-1 text-sm text-muted">
        Stop {step + 1} of {STOPS.length}
      </p>

      {loading || loadFailed ? (
        <div className="mt-5 text-sm" role="status">
          {loading ? "Loading your account…" : (
            <>
              <p role="alert">{error}</p>
              <button type="button" className="mt-3 text-jade-800 underline" onClick={() => window.location.reload()}>Try again</button>
            </>
          )}
        </div>
      ) : <>
      {step === 0 ? (
        <form
          id="signup-account"
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            showStep(1);
          }}
        >
          <Stagger className="grid gap-4">
            <Field label="Email">
              <TextInput
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Username">
              <TextInput
                name="username"
                autoComplete="username"
                required
                pattern=".*\S.*"
                title="Enter a username with at least one non-space character."
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>
            <Field label="Password" hint={customizing ? "Leave blank to keep your current password." : undefined}>
              <TextInput
                type="password"
                name="password"
                autoComplete="new-password"
                required={!customizing}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          </Stagger>
        </form>
      ) : null}

      {step === 1 ? (
        <Stagger className="mt-5 grid gap-4">
          <Field label="ZIP code" hint="This sets the state electricity average and the charging search.">
            <TextInput inputMode="numeric" autoComplete="postal-code" value={zip} onChange={(event) => setZip(event.target.value)} />
          </Field>
          <Field label="Home charging">
            <SelectInput value={charge} onChange={(event) => setCharge(event.target.value as ChargeAccess)}>
              <option value="yes">Yes, I can charge at home</option>
              <option value="maybe">I could install a charger</option>
              <option value="no">No</option>
              <option value="unsure">Not sure</option>
            </SelectInput>
          </Field>
        </Stagger>
      ) : null}

      {step === 2 ? (
        <Stagger className="mt-5 grid gap-4">
          <Field label="Year">
            <SelectInput
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                setCarId(modelsForYear(nextYear)[0]?.id ?? carId);
              }}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Model">
            <SelectInput value={car.id} onChange={(event) => setCarId(event.target.value)}>
              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.model}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Color">
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
          <Field label="Current mileage">
            <TextInput inputMode="numeric" value={miles} onChange={(event) => setMiles(event.target.value)} />
          </Field>
          <Field label="VIN, optional">
            <TextInput value={vin} autoComplete="off" onChange={(event) => setVin(event.target.value.toUpperCase())} />
          </Field>
        </Stagger>
      ) : null}

      {step === 3 ? (
        <Stagger className="mt-5 grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Ownership</legend>
            {(
              [
                ["owned", "Own"],
                ["loan", "Loan"],
                ["lease", "Lease"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="finance" checked={finance === value} onChange={() => setFinance(value)} />
                {label}
              </label>
            ))}
          </fieldset>

          {finance === "owned" ? (
            <>
              <Field label="Purchase date">
                <TextInput type="month" value={purchasedOn} onChange={(event) => setPurchasedOn(event.target.value)} />
              </Field>
              <Field label="How you acquired it">
                <SelectInput value={acquired} onChange={(event) => setAcquired(event.target.value as typeof acquired)}>
                  <option value="new">New</option>
                  <option value="cpo">Certified pre-owned</option>
                  <option value="used">Used</option>
                </SelectInput>
              </Field>
            </>
          ) : null}

          {finance === "loan" ? (
            <>
              <Field label="Original loan amount, dollars">
                <TextInput inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
              </Field>
              <Field label="Start date">
                <TextInput type="month" value={startedOn} onChange={(event) => setStartedOn(event.target.value)} />
              </Field>
              <Field label="APR, percent">
                <TextInput inputMode="decimal" value={apr} onChange={(event) => setApr(event.target.value)} />
              </Field>
              <Field label="Original term, months">
                <TextInput inputMode="numeric" value={term} onChange={(event) => setTerm(event.target.value)} />
              </Field>
              <Field label="Months remaining">
                <TextInput inputMode="numeric" value={remaining} onChange={(event) => setRemaining(event.target.value)} />
              </Field>
              <Field label="Monthly payment, dollars" hint="Optional. If you type one, the comparison uses it.">
                <TextInput inputMode="decimal" value={payment} onChange={(event) => setPayment(event.target.value)} />
              </Field>
              <Field label="Loan agreement" hint="The file stays in this browser. The estimate uses the amounts you typed, not the document.">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="block w-full text-sm"
                  onChange={(event) => setAgreementName(event.target.files?.[0]?.name ?? "")}
                />
                {agreementName ? <span className="mt-1 block text-sm text-muted">Saved filename: {agreementName}. Choose a file to replace it.</span> : null}
              </Field>
            </>
          ) : null}

          {finance === "lease" ? (
            <>
              <Field label="Payoff, dollars">
                <TextInput inputMode="decimal" value={payoff} onChange={(event) => setPayoff(event.target.value)} />
              </Field>
              <Field label="Months remaining">
                <TextInput inputMode="numeric" value={remaining} onChange={(event) => setRemaining(event.target.value)} />
              </Field>
              <Field label="Monthly payment, dollars">
                <TextInput inputMode="decimal" value={payment} onChange={(event) => setPayment(event.target.value)} />
              </Field>
            </>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Known issues</legend>
            {ISSUE_OPTIONS.map((issue) => (
              <label key={issue.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={issues.includes(issue.id)}
                  onChange={() => toggleIssue(issue.id)}
                />
                {issue.label}
              </label>
            ))}
          </fieldset>

          <div className="border border-line bg-white p-4 text-sm">
            <p className="font-medium">Estimated trade-in</p>
            <p className="mt-1 text-2xl font-semibold">{formatDollars(preview.value.tradeInCents)}</p>
            <p className="mt-1 text-muted">
              Modelled range {formatDollars(preview.value.retailLowCents)} to{" "}
              {formatDollars(preview.value.retailHighCents)}. Example pricing, not a market quote.
            </p>
            {finance !== "owned" ? (
              <p className="mt-2">
                Still to pay: {formatDollars(preview.balance)}.
                {preview.value.tradeInCents - preview.balance < 0
                  ? " The trade is underwater by that gap."
                  : ` Equity is ${formatDollars(preview.value.tradeInCents - preview.balance)}.`}
              </p>
            ) : null}
            {finance === "loan" && !payment ? (
              <p className="mt-2 text-muted">
                Computed payment from the amount, rate, and term: {formatDollars(preview.computedPayment)} a month.
              </p>
            ) : null}
          </div>
        </Stagger>
      ) : null}

      {step === 4 ? (
        <Stagger className="mt-5 grid gap-4">
          <Field label="Budget for the next vehicle, dollars a month">
            <TextInput inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} />
          </Field>
          <Field label="Miles on a typical day">
            <TextInput inputMode="numeric" value={daily} onChange={(event) => setDaily(event.target.value)} />
          </Field>
          <div>
            <p className="text-sm font-medium">Rank what you consider. First counts most.</p>
            <p className="mt-1 text-sm text-muted">Drag a row to move it. Arrow keys also work.</p>
            <Reorder.Group
              axis="y"
              values={priorities}
              onReorder={setPriorities}
              as="ol"
              className="mt-2 grid gap-2"
            >
              {priorities.map((key, index) => (
                <Reorder.Item
                  key={key}
                  value={key}
                  as="li"
                  tabIndex={0}
                  aria-label={`${index + 1}. ${PRIORITY_COPY[key]}. Drag to reorder.`}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      movePriority(index, -1);
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      movePriority(index, 1);
                    }
                  }}
                  className="flex cursor-grab items-center justify-between gap-3 border border-line bg-white px-3 py-2 select-none active:cursor-grabbing"
                >
                  <span className="text-sm">
                    {index + 1}. {PRIORITY_COPY[key]}
                  </span>
                  <span className="text-muted" aria-hidden>
                    ⋮⋮
                  </span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
          <Field label="Other" hint="Shown on the recommendation. Not part of the score.">
            <TextInput value={other} onChange={(event) => setOther(event.target.value)} />
          </Field>
        </Stagger>
      ) : null}

      {error ? (
        <div className="mt-4 text-sm">
          <p role="alert">{error}</p>
          {step > 0 ? <button type="button" className="mt-2 text-jade-800 underline" onClick={() => showStep(0)}>Edit account details</button> : null}
        </div>
      ) : null}
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            disabled={saving}
            className="h-11 rounded-md border border-line px-4 text-sm"
            onClick={() => showStep(step - 1)}
          >
            Back
          </button>
        ) : null}
        {step < STOPS.length - 1 ? (
          <button
            type={step === 0 ? "submit" : "button"}
            form={step === 0 ? "signup-account" : undefined}
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
            onClick={() => {
              if (step === 0) return;
              showStep(step + 1);
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
            onClick={finish}
          >
            {saving ? "Saving…" : customizing ? "Save changes" : "Start the drive"}
          </button>
        )}
      </div>
      </>}
    </Landmark>
  );
}
