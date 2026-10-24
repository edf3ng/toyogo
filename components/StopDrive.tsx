import { HORIZON_LABEL, MILE_PRESETS, MIX_LABEL, PRIORITY_LABEL, UPCOMING_LABEL } from "@/config/copy";
import type { JourneyState } from "@/components/journey-state";
import type { DriveMix, KeepHorizon, Priority, Upcoming } from "@/types";

const QUESTIONS = [
  "How many miles a year?",
  "Mostly city, mostly highway, or a mix?",
  "How long do you plan to keep this car?",
  "What matters most?",
  "Any of these coming up?",
] as const;

export function StopDrive({
  state,
  question,
  onQuestion,
  onChange,
  onBack,
  onContinue,
}: {
  state: JourneyState;
  question: number;
  onQuestion: (index: number) => void;
  onChange: (patch: Partial<JourneyState>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const driving = state.driving;
  const last = question === QUESTIONS.length - 1;

  return (
    <section>
      <p className="text-sm text-muted">
        Question {question + 1} of {QUESTIONS.length}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{QUESTIONS[question]}</h1>

      <div className="mt-5">
        {question === 0 ? (
          <div>
            <div className="flex gap-2">
              {MILE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`h-10 flex-1 rounded-md border text-sm ${
                    driving.annualMiles === preset.miles
                      ? "border-jade text-jade-800"
                      : "border-line"
                  }`}
                  onClick={() => onChange({ driving: { ...driving, annualMiles: preset.miles } })}
                >
                  {preset.label}
                  <span className="block text-xs text-muted">
                    {preset.miles.toLocaleString("en-US")}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={2000}
                max={30000}
                step={500}
                value={driving.annualMiles}
                onChange={(event) =>
                  onChange({ driving: { ...driving, annualMiles: Number(event.target.value) } })
                }
                className="w-full"
              />
              <span className="w-24 shrink-0 text-right text-sm tabular-nums">
                {driving.annualMiles.toLocaleString("en-US")}
              </span>
            </div>
          </div>
        ) : null}

        {question === 1 ? (
          <Choice
            name="mix"
            value={driving.mix}
            options={(["city", "mix", "highway"] as DriveMix[]).map((id) => ({
              id,
              label: MIX_LABEL[id],
            }))}
            onChange={(mix) => onChange({ driving: { ...driving, mix } })}
          />
        ) : null}

        {question === 2 ? (
          <Choice
            name="horizon"
            value={driving.horizon}
            options={(["under_1", "1_to_3", "3_plus", "unsure"] as KeepHorizon[]).map((id) => ({
              id,
              label: HORIZON_LABEL[id],
            }))}
            onChange={(horizon) => onChange({ driving: { ...driving, horizon } })}
          />
        ) : null}

        {question === 3 ? (
          <Choice
            name="priority"
            value={driving.priority}
            options={(
              ["lowest_payment", "lowest_total", "newest_car", "lowest_emissions"] as Priority[]
            ).map((id) => ({ id, label: PRIORITY_LABEL[id] }))}
            onChange={(priority) => onChange({ driving: { ...driving, priority } })}
          />
        ) : null}

        {question === 4 ? (
          <Choice
            name="upcoming"
            value={driving.upcoming}
            options={(
              ["lease_ending", "repair_needed", "income_change", "none"] as Upcoming[]
            ).map((id) => ({ id, label: UPCOMING_LABEL[id] }))}
            onChange={(upcoming) => onChange({ driving: { ...driving, upcoming } })}
          />
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="h-11 rounded-md border border-line px-4 text-sm"
          onClick={() => (question === 0 ? onBack() : onQuestion(question - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="h-11 rounded-md bg-jade px-4 text-sm font-medium text-white hover:bg-jade-800"
          onClick={() => (last ? onContinue() : onQuestion(question + 1))}
        >
          {last ? "See the car" : "Next"}
        </button>
      </div>
    </section>
  );
}

function Choice<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm ${
            value === option.id ? "border-jade" : "border-line"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="accent-jade"
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
