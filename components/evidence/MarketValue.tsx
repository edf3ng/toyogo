"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketValue as Market } from "@/types/market";

const dollars = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
      .then((data: { source: string; value?: Market }) => setState(data.value ?? "none"))
      .catch((error) => {
        if (error?.name !== "AbortError") setState("none");
      });
    return () => controller.abort();
  }, [year, model, miles, issueKey]);

  if (state === "loading") return <p className="mt-6 text-sm text-muted">Checking live market prices…</p>;
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
