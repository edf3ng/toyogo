"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDollars } from "@/lib/format";
import type { CurvePoint } from "@/types";

export function ValueChart({ points, ageYears }: { points: CurvePoint[]; ageYears: number }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="ageYears"
            tick={{ fontSize: 12, fill: "#14202A" }}
            tickLine={false}
            axisLine={{ stroke: "#ddd6cb" }}
          />
          <YAxis
            tickFormatter={(value) => formatDollars(Number(value))}
            tick={{ fontSize: 12, fill: "#14202A" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value, name) => [formatDollars(Number(value)), String(name)]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Area dataKey="highCents" name="High" stroke="none" fill="#E8913A" fillOpacity={0.45} />
          <Area dataKey="lowCents" name="Low" stroke="none" fill="#FDFBF7" />
          <Line
            dataKey="valueCents"
            name="Modelled value"
            stroke="#14202A"
            strokeWidth={2}
            dot={false}
          />
          <ReferenceLine x={Math.round(ageYears)} stroke="#14202A" strokeDasharray="3 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
