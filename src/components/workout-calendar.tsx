"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalDay = {
  id: string;
  name: string;
  date: string; // ISO
  volume: number;
  sets: number;
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function WorkoutCalendar({ workouts }: { workouts: CalDay[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(() =>
    dayKey(new Date()),
  );

  // Workouts pro Tag gruppieren.
  const byDay = useMemo(() => {
    const map = new Map<string, CalDay[]>();
    for (const w of workouts) {
      const k = dayKey(parseISO(w.date));
      const arr = map.get(k);
      if (arr) arr.push(w);
      else map.set(k, [w]);
    }
    return map;
  }, [workouts]);

  const maxVolume = useMemo(
    () => Math.max(1, ...workouts.map((w) => w.volume)),
    [workouts],
  );

  // Aktuelle Wochen-Serie: zusammenhängende Wochen (Mo-So) mit ≥1 Training.
  const weekStreak = useMemo(() => {
    const weeks = new Set<string>();
    for (const w of workouts) {
      weeks.add(dayKey(startOfWeek(parseISO(w.date), { weekStartsOn: 1 })));
    }
    let streak = 0;
    let cursor = startOfWeek(new Date(), { weekStartsOn: 1 });
    while (weeks.has(dayKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -7);
    }
    return streak;
  }, [workouts]);

  const monthCount = useMemo(
    () =>
      workouts.filter((w) => isSameMonth(parseISO(w.date), month)).length,
    [workouts, month],
  );

  // 6 Wochen Raster ab Montag der ersten Monatswoche.
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const today = new Date();
  const selectedWorkouts = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold">{weekStreak}</p>
          <p className="text-xs text-muted">
            {weekStreak === 1 ? "Woche" : "Wochen"} Serie
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold">{monthCount}</p>
          <p className="text-xs text-muted">Trainings im Monat</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        {/* Monatskopf */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 active:bg-surface-2"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="font-semibold">
            {format(month, "MMMM yyyy", { locale: de })}
          </h2>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-2 active:bg-surface-2"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Wochentage */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Tage */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const k = dayKey(d);
            const entries = byDay.get(k);
            const inMonth = isSameMonth(d, month);
            const isToday = isSameDay(d, today);
            const isSelected = selected === k;
            const intensity = entries
              ? 0.25 +
                0.75 *
                  Math.min(
                    1,
                    entries.reduce((s, e) => s + e.volume, 0) / maxVolume,
                  )
              : 0;
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg text-sm transition-colors",
                  !inMonth && "text-muted/40",
                  inMonth && !entries && "text-foreground hover:bg-surface-2",
                  isSelected && "ring-2 ring-primary",
                )}
                style={
                  entries
                    ? {
                        background: `color-mix(in srgb, var(--primary) ${Math.round(
                          intensity * 100,
                        )}%, transparent)`,
                        color: intensity > 0.6 ? "#fff" : undefined,
                      }
                    : undefined
                }
              >
                {format(d, "d")}
                {isToday && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tagesdetail */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          {selected
            ? format(parseISO(selected), "EEEE, dd. MMMM yyyy", { locale: de })
            : "Tag wählen"}
        </h3>
        {selectedWorkouts.length === 0 ? (
          <p className="text-sm text-muted">An diesem Tag kein Training.</p>
        ) : (
          <ul className="space-y-2">
            {selectedWorkouts.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/history/${w.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                >
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-muted">
                      {w.sets} Sätze · {Math.round(w.volume)} kg ·{" "}
                      {format(parseISO(w.date), "HH:mm", { locale: de })} Uhr
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
