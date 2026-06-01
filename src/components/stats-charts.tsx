"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const axisStyle = { fontSize: 11, fill: "#8b8b94" };
const tooltipStyle = {
  background: "#1c1c21",
  border: "1px solid #2a2a31",
  borderRadius: 8,
  fontSize: 12,
};

export function StatsCharts({
  volumeByWeek,
  volumeByMuscle,
}: {
  volumeByWeek: { week: string; volume: number }[];
  volumeByMuscle: { muscle: string; volume: number }[];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Volumen pro Woche (kg)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={volumeByWeek} margin={{ left: -10, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
            <XAxis dataKey="week" tick={axisStyle} tickLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#6366f1" }} />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#6366f1" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Volumen pro Muskelgruppe (kg)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={volumeByMuscle}
            layout="vertical"
            margin={{ left: 20, right: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" horizontal={false} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="muscle"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
            <Bar dataKey="volume" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
