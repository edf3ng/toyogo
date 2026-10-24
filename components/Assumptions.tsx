import { assumptionRows } from "@/lib/assumptions";

export function Assumptions({ electricityCents }: { electricityCents: number }) {
  const rows = assumptionRows(electricityCents);
  return (
    <details className="border-t border-line py-3">
      <summary className="text-sm font-medium">Assumptions behind the numbers</summary>
      <dl className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-sm font-medium">
              {row.label}
              <span className="ml-2 font-normal tabular-nums text-muted">{row.value}</span>
            </dt>
            <dd className="text-sm text-muted">{row.note}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
