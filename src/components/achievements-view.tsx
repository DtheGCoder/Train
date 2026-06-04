"use client";

import { useMemo, useState } from "react";
import {
  Play,
  Dumbbell,
  Trophy,
  Crown,
  Flame,
  CalendarDays,
  Weight,
  Zap,
  List,
  Repeat,
  TrendingUp,
  Shuffle,
  Layers,
  Sunrise,
  Moon,
  Star,
  Award,
  Check,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, type AchCategory } from "@/lib/achievements";

export type AchRow = {
  id: string;
  category: AchCategory;
  title: string;
  desc: string;
  icon: string;
  points: number;
  goal: number;
  unit?: string;
  value: number;
  progress: number;
  earned: boolean;
};

const ICON: Record<string, typeof Play> = {
  play: Play,
  dumbbell: Dumbbell,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  calendar: CalendarDays,
  weight: Weight,
  zap: Zap,
  list: List,
  repeat: Repeat,
  "trending-up": TrendingUp,
  shuffle: Shuffle,
  layers: Layers,
  sunrise: Sunrise,
  moon: Moon,
  star: Star,
};

const fmt = (n: number) =>
  n >= 1000 ? Math.round(n).toLocaleString("de-DE") : `${Math.round(n)}`;

type FilterId = "all" | "earned" | "open" | AchCategory;
type SortId = "progress" | "points" | "title";

export function AchievementsView({
  rows,
  earnedPoints,
  totalPoints,
}: {
  rows: AchRow[];
  earnedPoints: number;
  totalPoints: number;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("progress");

  const earnedCount = rows.filter((r) => r.earned).length;
  const overall = totalPoints > 0 ? earnedPoints / totalPoints : 0;

  const cats = [...new Set(rows.map((r) => r.category))];

  const view = useMemo(() => {
    let list = rows.slice();
    if (filter === "earned") list = list.filter((r) => r.earned);
    else if (filter === "open") list = list.filter((r) => !r.earned);
    else if (filter !== "all") list = list.filter((r) => r.category === filter);

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "points") return b.points - a.points;
      // progress: fast fertige offene zuerst, erledigte ans Ende
      if (a.earned !== b.earned) return a.earned ? 1 : -1;
      return b.progress - a.progress;
    });
    return list;
  }, [rows, filter, sort]);

  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: "Alle" },
    { id: "open", label: "Offen" },
    { id: "earned", label: "Erreicht" },
    ...cats.map((c) => ({ id: c, label: CATEGORY_LABEL[c] })),
  ];

  return (
    <div className="space-y-4">
      {/* Übersicht */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <Award className="size-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {earnedCount} / {rows.length} Achievements
            </p>
            <p className="text-xs text-muted">
              {earnedPoints} von {totalPoints} Belohnungspunkten · zählen in die
              Bestenliste
            </p>
          </div>
          <span className="text-xl font-extrabold tabular-nums text-primary">
            {Math.round(overall * 100)}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${overall * 100}%` }}
          />
        </div>
      </div>

      {/* Filter + Sortierung */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:border-primary/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Sortieren:</span>
          {(
            [
              ["progress", "Fortschritt"],
              ["points", "Punkte"],
              ["title", "A–Z"],
            ] as [SortId, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={cn(
                "rounded-md px-2 py-1 font-medium transition-colors",
                sort === id ? "bg-surface-2 text-foreground" : "hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <ul className="space-y-2">
        {view.map((r) => {
          const Icon = ICON[r.icon] ?? Star;
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border p-3 transition-colors",
                r.earned
                  ? "border-success/40 bg-success/5"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "relative flex size-11 shrink-0 items-center justify-center rounded-xl",
                    r.earned ? "bg-success/20" : "bg-surface-2",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      r.earned ? "text-success" : "text-muted",
                    )}
                  />
                  {r.earned ? (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-2.5" />
                    </span>
                  ) : (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <Lock className="size-2.5" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate font-semibold", !r.earned && "text-foreground/90")}>
                      {r.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                        r.earned
                          ? "bg-success/15 text-success"
                          : "bg-surface-2 text-muted",
                      )}
                    >
                      +{r.points}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted">{r.desc}</p>
                </div>
              </div>
              {!r.earned && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-700"
                      style={{ width: `${r.progress * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted">
                    {fmt(r.value)}/{fmt(r.goal)}
                    {r.unit ? ` ${r.unit}` : ""}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
