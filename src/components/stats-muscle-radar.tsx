"use client";

import { useMemo, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type RadarPoint = {
  date: string; // yyyy-MM-dd
  group: string;
  reps: number;
  sets: number;
  volume: number;
};

// Feste Reihenfolge & Position der 6 Hauptgruppen (im Uhrzeigersinn).
const GROUP_ORDER = [
  "Rückenmuskulatur",
  "Schultern",
  "Rumpf",
  "Arme",
  "Brust",
  "Beine",
];

type Metric = "reps" | "sets" | "volume";
const METRICS: { key: Metric; label: string }[] = [
  { key: "reps", label: "Wdh." },
  { key: "sets", label: "Sätze" },
  { key: "volume", label: "Volumen" },
];

const RANGES: { value: number; label: string }[] = [
  { value: 7, label: "Letzte 7 Tage" },
  { value: 30, label: "Letzte 30 Tage" },
  { value: 90, label: "Letzte 90 Tage" },
  { value: 0, label: "Gesamt" },
];

const AMBER = "#f59e0b";

function fmt(v: number): string {
  return Math.round(v).toLocaleString("de-DE");
}

export function MuscleGroupRadar({ data }: { data: RadarPoint[] }) {
  const [metric, setMetric] = useState<Metric>("reps");
  const [range, setRange] = useState<number>(7);
  // „Jetzt" einmal beim Mount festhalten (kein Date.now() im Render).
  const [now] = useState(() => Date.now());

  const { chart, valueByGroup, total } = useMemo(() => {
    const cutoff = range > 0 ? now - range * 24 * 60 * 60 * 1000 : -Infinity;
    const acc: Record<string, number> = {};
    for (const g of GROUP_ORDER) acc[g] = 0;
    for (const p of data) {
      if (Date.parse(p.date) < cutoff) continue;
      if (!(p.group in acc)) continue;
      acc[p.group] += p[metric];
    }
    const chart = GROUP_ORDER.map((g) => ({ group: g, value: acc[g] }));
    const total = Object.values(acc).reduce((a, b) => a + b, 0);
    return { chart, valueByGroup: acc, total };
  }, [data, metric, range, now]);

  // Custom-Tick: Gruppenname + Wert (Bernstein) unter dem Namen.
  const renderTick = (props: {
    x: number;
    y: number;
    payload: { value: string };
    textAnchor: string;
    cy: number;
  }) => {
    const { x, y, payload, textAnchor, cy } = props;
    const g = payload.value;
    const below = y > cy; // untere Hälfte → Wert unter den Namen
    const nameY = below ? y : y - 7;
    const valY = nameY + 17;
    return (
      <g>
        <text
          x={x}
          y={nameY}
          textAnchor={textAnchor as "start" | "middle" | "end"}
          fill="#ededed"
          fontSize={13}
          fontWeight={600}
        >
          {g}
        </text>
        <text
          x={x}
          y={valY}
          textAnchor={textAnchor as "start" | "middle" | "end"}
          fill={AMBER}
          fontSize={13}
          fontWeight={700}
        >
          {fmt(valueByGroup[g] ?? 0)}
        </text>
      </g>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      {/* Kopf: Titel + Zeitraum */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Muskel Gruppen</h2>
        <div className="relative">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="appearance-none rounded-full bg-surface-2 py-2 pl-4 pr-9 text-sm font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
            aria-label="Zeitraum"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      {/* Umschalter: Wdh. / Sätze / Volumen */}
      <div className="mb-2 flex rounded-full bg-surface-2 p-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-medium transition-colors",
              metric === m.key
                ? "bg-border text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Radar */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={chart} margin={{ top: 28, bottom: 28, left: 8, right: 8 }} outerRadius="68%">
            <PolarGrid stroke="#2a2a31" />
            <PolarAngleAxis
              dataKey="group"
              tick={renderTick as unknown as undefined}
            />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, "auto"]} />
            {total > 0 && (
              <Radar
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fill="#6366f1"
                fillOpacity={0.35}
                isAnimationActive
              />
            )}
          </RadarChart>
        </ResponsiveContainer>

        {/* Leerzustand */}
        {total === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-surface-2/80 px-6 py-4 text-center backdrop-blur-sm">
              <p className="text-lg font-bold">Keine Daten</p>
              <p className="mt-1 text-sm text-muted">
                Bitte versuche einen anderen Datumsbereich oder Filter.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
