"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PRIORITY_KEYS, type PriorityKey } from "@/config/priorities";

const SHORT: Record<PriorityKey, string> = {
  payment: "Payment",
  total: "5-year cost",
  fuel: "Fuel",
  co2: "Emissions",
  practical: "Cargo and seats",
  performance: "Performance",
};

function shareLabel(value: number): string {
  return value.toFixed(2);
}

/** Weighted priority shares for one scored car. Amber is the bar fill only. */
export function ScoreBars({ factors }: { factors: Record<PriorityKey, number> }) {
  const data = PRIORITY_KEYS.map((key) => ({ name: SHORT[key], value: factors[key] }));
  const peak = Math.max(...data.map((row) => row.value), 0.1);
  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 20 }}>
            <XAxis
              type="number"
              domain={[0, Number((peak * 1.2).toFixed(2))]}
              ticks={[0, Number((peak / 2).toFixed(2)), Number(peak.toFixed(2))]}
              tick={{ fontSize: 11, fill: "#14202A" }}
              tickFormatter={shareLabel}
              axisLine={{ stroke: "#2E3440" }}
              tickLine={{ stroke: "#2E3440" }}
              label={{
                value: "Share of the score",
                position: "insideBottom",
                offset: -12,
                fill: "#14202A",
                fontSize: 11,
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={{ fontSize: 12, fill: "#14202A" }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="value" barSize={18} radius={[0, 3, 3, 0]} minPointSize={2}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.value > 0 ? "#E8913A" : "#2E3440"} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) => shareLabel(Number(value))}
                style={{ fontSize: 11, fill: "#14202A" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-muted">Share of the score, not dollars. Payment is 0 when this car costs the most extra.</p>
    </div>
  );
}
