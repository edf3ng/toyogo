import type { ReactNode } from "react";

const control =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-base text-ink";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={control} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={control} />;
}

export function DollarInput({
  cents,
  onChange,
}: {
  cents: number;
  onChange: (cents: number) => void;
}) {
  return (
    <TextInput
      inputMode="decimal"
      value={String(Math.round(cents / 100))}
      onChange={(event) => {
        const digits = event.target.value.replace(/[^0-9.]/g, "");
        const dollars = Number(digits);
        onChange(Number.isFinite(dollars) ? Math.round(dollars * 100) : 0);
      }}
    />
  );
}
