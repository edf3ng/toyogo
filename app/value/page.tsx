import Image from "next/image";
import Link from "next/link";
import { PERSONAS, analysisFor } from "@/data/personas";
import { recommend } from "@/lib/engine/recommend";

export default function ValuePage() {
  const rows = PERSONAS.map((persona) => {
    const result = recommend(analysisFor(persona));
    return {
      id: persona.id,
      title: persona.name ? `${persona.name} — ${persona.title}` : persona.title,
      blurb: persona.blurb,
      move: result.headline.title,
      vehicle: result.headline.vehicleLabel,
      step: result.headline.next.title,
      kind: result.headline.next.kind,
    };
  });
  const selfService = rows.filter((row) => row.kind === "SELF_SERVICE").length;
  const offers = rows.filter((row) => row.kind === "ELIGIBLE_OFFER").length;
  const followUp = rows.filter((row) => row.kind === "FOLLOW_UP").length;

  return (
    <section>
      <figure className="mb-5">
        <div className="relative h-48 w-full border border-line">
          <Image
            src="/images/reststop.jpg"
            alt="A highway rest stop at the edge of the road."
            fill
            sizes="(min-width: 1024px) 64rem, 100vw"
            className="object-cover"
          />
        </div>
        <figcaption className="mt-1 text-sm text-muted">
          Three scenarios from one afternoon on the road.
        </figcaption>
      </figure>
      <h1 className="text-2xl font-semibold tracking-tight">What this session would do</h1>
      <p className="mt-2 text-sm text-muted">
        Simulated — illustrative only. Counts are the three built-in scenarios run through the
        same rules as the customer flow. No industry baseline is claimed.
      </p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Self-service</dt>
          <dd className="text-3xl font-semibold tabular-nums">{selfService}</dd>
          <dd className="text-sm text-muted">A call that does not need an agent.</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Example offer</dt>
          <dd className="text-3xl font-semibold tabular-nums">{offers}</dd>
          <dd className="text-sm text-muted">A next vehicle, still subject to review.</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Specialist follow-up</dt>
          <dd className="text-3xl font-semibold tabular-nums">{followUp}</dd>
          <dd className="text-sm text-muted">Payoff or refinance large enough to hand off.</dd>
        </div>
      </dl>
      <ul className="mt-8 space-y-4 border-t border-line pt-4">
        {rows.map((row) => (
          <li key={row.id}>
            <p className="text-sm font-medium">{row.title}</p>
            <p className="text-sm text-muted">{row.blurb}</p>
            <p className="text-sm">
              {row.move}
              {row.vehicle ? ` — ${row.vehicle}` : ""}. Next step: {row.step}.
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/" className="text-jade-800">
          Back to the customer flow
        </Link>
      </p>
    </section>
  );
}
