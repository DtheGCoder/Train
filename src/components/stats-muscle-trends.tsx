"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { startOfWeek, startOfMonth, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type TrendPoint = {
  date: string; // yyyy-MM-dd
  muscle: string;
  volume: number;
  sets: number;
};

type Granularity = "day" | "week" | "month";
type Metric = "volume" | "sets";

const PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#3b82f6",
];

const axisStyle = { fontSize: 11, fill: "#8b8b94" };
const tooltipStyle = {
  background: "#1c1c21",
  border: "1px solid #2a2a31",
  borderRadius: 8,
  fontSize: 12,
};

function bucketKey(dateStr: string, g: Granularity): { key: string; label: string } {
  const d = parseISO(dateStr);
  if (g === "day") {
    return { key: dateStr, label: format(d, "dd.MM.", { locale: de }) };
  }
  if (g === "week") {
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    return {
      key: format(ws, "yyyy-MM-dd"),
      label: "KW " + format(ws, "ww", { locale: de }),
    };
  }
  const ms = startOfMonth(d);
  return { key: format(ms, "yyyy-MM"), label: format(ms, "MMM yy", { locale: de }) };
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MuscleTrends({ data }: { data: TrendPoint[] }) {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [metric, setMetric] = useState<Metric>("volume");
  const [selected, setSelected] = useState<string>("__all__");

  // Muskelgruppen nach Gesamtvolumen sortiert + Farbe
  const muscleColors = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of data) totals.set(d.muscle, (totals.get(d.muscle) ?? 0) + d.volume);
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const map = new Map<string, string>();
    sorted.forEach((m, i) => map.set(m, PALETTE[i % PALETTE.length]));
    return map;
  }, [data]);

  const muscles = useMemo(() => [...muscleColors.keys()], [muscleColors]);

  // Gestapelte Daten: pro Zeitraum eine Zeile mit je Muskel einem Wert
  const stacked = useMemo(() => {
    const periods = new Map<string, { label: string; order: string } & Record<string, number | string>>();
    for (const d of data) {
      const { key, label } = bucketKey(d.date, granularity);
      let row = periods.get(key);
      if (!row) {
        row = { label, order: key };
        periods.set(key, row);
      }
      const val = metric === "volume" ? d.volume : d.sets;
      row[d.muscle] = ((row[d.muscle] as number) ?? 0) + val;
    }
    return [...periods.values()]
      .sort((a, b) => (a.order < b.order ? -1 : 1))
      .map((r) => {
        if (metric === "volume") {
          for (const m of muscles) if (typeof r[m] === "number") r[m] = Math.round(r[m] as number);
        }
        return r;
      });
  }, [data, granularity, metric, muscles]);

  // Einzel-Muskel-Reihe
  const single = useMemo(() => {
    if (selected === "__all__") return [];
    const periods = new Map<string, { label: string; order: string; value: number }>();
    for (const d of data) {
      if (d.muscle !== selected) continue;
      const { key, label } = bucketKey(d.date, granularity);
      let row = periods.get(key);
      if (!row) {
        row = { label, order: key, value: 0 };
        periods.set(key, row);
      }
      row.value += metric === "volume" ? d.volume : d.sets;
    }
    return [...periods.values()]
      .sort((a, b) => (a.order < b.order ? -1 : 1))
      .map((r) => ({ ...r, value: Math.round(r.value) }));
  }, [data, granularity, metric, selected]);

  const unit = metric === "volume" ? "kg" : "Sätze";

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
        Noch keine Daten für die Auswertung.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: "day", label: "Tag" },
            { value: "week", label: "Woche" },
            { value: "month", label: "Monat" },
          ]}
        />
        <Toggle
          value={metric}
          onChange={setMetric}
          options={[
            { value: "volume", label: "Volumen" },
            { value: "sets", label: "Sätze" },
          ]}
        />
      </div>

      {/* Muskel-Auswahl */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelected("__all__")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected === "__all__"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted hover:text-foreground",
          )}
        >
          Alle (gestapelt)
        </button>
        {muscles.map((m) => (
          <button
            key={m}
            onClick={() => setSelected(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selected === m
                ? "border-foreground/40 text-foreground"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: muscleColors.get(m) }}
            />
            {m}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">
          {selected === "__all__"
            ? `Alle Muskelgruppen · ${unit}`
            : `${selected} · ${unit}`}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          {selected === "__all__" ? (
            <BarChart data={stacked} margin={{ left: -8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {muscles.map((m) => (
                <Bar
                  key={m}
                  dataKey={m}
                  stackId="a"
                  fill={muscleColors.get(m)}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={single} margin={{ left: -8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a31" />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#6366f1" }} />
              <Line
                type="monotone"
                dataKey="value"
                name={selected}
                stroke={muscleColors.get(selected) ?? "#6366f1"}
                strokeWidth={2.5}
                dot={{ r: 3, fill: muscleColors.get(selected) ?? "#6366f1" }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
