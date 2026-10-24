"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { FactorContributions } from "@/types";

const LABELS: { key: keyof FactorContributions; name: string }[] = [
  { key: "payment", name: "Payment" },
  { key: "total", name: "Five-year cost" },
  { key: "fuel", name: "Fuel" },
  { key: "co2", name: "Emissions" },
  { key: "fit", name: "Horizon fit" },
  { key: "complexity", name: "Complexity" },
];

export function WhyChart({ contributions }: { contributions: FactorContributions }) {
  const data = LABELS.map((item) => ({ name: item.name, value: contributions[item.key] }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tick={{ fontSize: 12, fill: "#14202A" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" barSize={12}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.value < 0 ? "#2E3440" : "#E8913A"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
