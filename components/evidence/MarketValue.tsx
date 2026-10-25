"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketValue as Market } from "@/types/market";

const dollars = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The searches run first and return in about a second. The rest is the model reading them. */
function waitingLine(seconds: number): string {
  if (seconds < 4) return "Searching KBB, Edmunds and CarGurus…";
  if (seconds < 15) return "Reading the listings that came back…";
  return "Still working. A busy model can take a minute.";
}

function Bar({ className = "", delay = 0, height }: { className?: string; delay?: number; height?: string }) {
  return <div className={`animate-pulse bg-line/70 ${className}`} style={{ animationDelay: `${delay}ms`, height }} />;
}

function MarketLoading() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-6 border-t border-line pt-4">
      <h2 className="text-lg font-semibold">Market check</h2>
      <p className="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted">
        <span aria-live="polite">{waitingLine(seconds)}</span>
        <span className="tabular-nums">{seconds}s</span>
      </p>
      <div className="relative mt-2 h-5 overflow-hidden" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-line" />
        <svg viewBox="0 0 28 16" className="absolute top-0 h-5 w-9 animate-drive">
          <path fill="#2e3440" d="M3 11h2l2-4h10l3 3h4v3H3v-2z" />
          <circle cx="8" cy="12" r="1.4" fill="#fdfbf7" />
          <circle cx="20" cy="12" r="1.4" fill="#fdfbf7" />
        </svg>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2" aria-hidden>
        {["Trade-in range", "Dealer asking range"].map((label, index) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="mt-1">
              <Bar className="h-6 w-40" delay={index * 150} />
            </dd>
            <dd className="mt-1">
              <Bar className="h-4 w-24" delay={index * 150 + 75} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex h-48 items-end gap-3 border border-line bg-white p-3" aria-hidden>
        {[38, 52, 67, 84].map((height, index) => (
          <Bar key={height} className="flex-1" delay={index * 180} height={`${height}%`} />
        ))}
      </div>
    </div>
  );
}

export function MarketValue({
  year,
  model,
  miles,
  issues,
}: {
  year: number;
  model: string;
  miles: number;
  issues: readonly string[];
}) {
  const [state, setState] = useState<"loading" | "none" | Market>("loading");
  const issueKey = issues.join(",");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch("/api/market", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, model, miles, issues: issueKey ? issueKey.split(",") : [] }),
    })
      .then((r) => r.json())
      .then((data: { source: string; value?: Market }) => {
        if (!controller.signal.aborted) setState(data.value ?? "none");
      })
      // An aborted fetch rejects as a plain TypeError in Safari, not an
      // AbortError, so the signal is what says whether this run still counts.
      .catch(() => {
        if (!controller.signal.aborted) setState("none");
      });
    return () => controller.abort();
  }, [year, model, miles, issueKey]);

  if (state === "loading") return <MarketLoading />;
  if (state === "none") {
    return <p className="mt-6 text-sm text-muted">Live market prices are unavailable, so the figures above are modelled.</p>;
  }

  const here = state.curve.find((p) => p.modelYear === year);
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h2 className="text-lg font-semibold">Market check</h2>
      <p className="mt-1 text-sm text-muted">From Google results (KBB, Edmunds, CarGurus), read by Gemini. Not a quote.</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Trade-in range</dt>
          <dd className="text-xl font-semibold">
            {dollars(state.tradeIn.lowDollars)} to {dollars(state.tradeIn.highDollars)}
          </dd>
          <dd className="text-muted">Mid {dollars(state.tradeIn.midDollars)}</dd>
        </div>
        <div>
          <dt className="text-muted">Dealer asking range</dt>
          <dd className="text-xl font-semibold">
            {dollars(state.retail.lowDollars)} to {dollars(state.retail.highDollars)}
          </dd>
          <dd className="text-muted">Mid {dollars(state.retail.midDollars)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm">{state.notes}</p>
      {state.comparables.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {state.comparables.map((c) => (
            <li key={c.link || c.title}>
              <a href={c.link} target="_blank" rel="noreferrer" className="text-jade-800">
                {c.title}
              </a>{" "}
              · {dollars(c.priceDollars)}
              {c.miles ? ` · ${c.miles.toLocaleString("en-US")} mi` : ""} · {c.source}
            </li>
          ))}
        </ul>
      ) : null}
      {state.curve.length > 1 ? (
        <div className="mt-4">
          <p className="text-sm text-muted">Typical asking price by model year</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="modelYear" tick={{ fontSize: 12, fill: "#14202A" }} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => dollars(Number(v))}
                  tick={{ fontSize: 12, fill: "#14202A" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  domain={["auto", "auto"]}
                />
                <Tooltip formatter={(v) => [dollars(Number(v)), "Asking"]} />
                <Line dataKey="midDollars" stroke="#14202A" strokeWidth={2} dot />
                {here ? <ReferenceDot x={year} y={here.midDollars} r={6} fill="#E8913A" stroke="none" /> : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
