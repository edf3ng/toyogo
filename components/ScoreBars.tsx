"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PRIORITY_KEYS, type PriorityKey } from "@/config/priorities";

const SHORT: Record<PriorityKey, string> = {
  payment: "Payment",
  total: "5-year cost",
  fuel: "Fuel",
  co2: "Emissions",
  practical: "Cargo and seats",
  performance: "Performance",
};

/** Weighted priority shares for one scored car. Amber is the bar fill only. */
export function ScoreBars({ factors }: { factors: Record<PriorityKey, number> }) {
  const data = PRIORITY_KEYS.map((key) => ({ name: SHORT[key], value: factors[key] }));
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tick={{ fontSize: 12, fill: "#14202A" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" barSize={12}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.value > 0 ? "#E8913A" : "#2E3440"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
