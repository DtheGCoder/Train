"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Dumbbell, Home, Building2 } from "lucide-react";

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  level: string;
  location: string;
  benefits: string;
  exerciseCount: number;
  color: string;
};

export const GOAL_LABEL: Record<string, string> = {
  strength: "Kraft",
  hypertrophy: "Muskelaufbau",
  endurance: "Kraftausdauer",
  general: "Allgemein",
  "": "—",
};
export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Erfahren",
  "": "—",
};
export const LOCATION_LABEL: Record<string, string> = {
  gym: "Studio",
  home: "Zuhause",
  both: "Studio & Zuhause",
  "": "—",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-surface text-muted hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function LocationIcon({ location }: { location: string }) {
  if (location === "home") return <Home className="size-3.5" />;
  if (location === "both") return <Building2 className="size-3.5" />;
  return <Dumbbell className="size-3.5" />;
}

export function RoutineCatalog({ items }: { items: CatalogItem[] }) {
  const [q, setQ] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [location, setLocation] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (goal && it.goal !== goal) return false;
      if (level && it.level !== level) return false;
      if (location && it.location !== location) return false;
      if (needle) {
        const hay =
          `${it.name} ${it.description} ${it.category} ${it.benefits}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, q, goal, level, location]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Vorlage suchen (z. B. Push, Beine, Zuhause)…"
          className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={goal === ""} onClick={() => setGoal("")}>
            Alle Ziele
          </Chip>
          {(["strength", "hypertrophy", "endurance", "general"] as const).map(
            (g) => (
              <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>
                {GOAL_LABEL[g]}
              </Chip>
            ),
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={location === ""} onClick={() => setLocation("")}>
            Überall
          </Chip>
          {(["gym", "home", "both"] as const).map((l) => (
            <Chip
              key={l}
              active={location === l}
              onClick={() => setLocation(l)}
            >
              {LOCATION_LABEL[l]}
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" />
          <Chip active={level === ""} onClick={() => setLevel("")}>
            Jedes Level
          </Chip>
          {(["beginner", "intermediate", "advanced"] as const).map((lv) => (
            <Chip key={lv} active={level === lv} onClick={() => setLevel(lv)}>
              {LEVEL_LABEL[lv]}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">
          Keine Vorlage passt zu den Filtern.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <li key={it.id}>
              <Link
                href={`/routines/${it.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ background: it.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{it.name}</p>
                      <ChevronRight className="ml-auto size-4 shrink-0 text-muted" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {it.exerciseCount} Übungen · {it.description}
                    </p>
                    {it.benefits && (
                      <p className="mt-2 text-xs leading-snug text-muted/90">
                        {it.benefits}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {it.category && (
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-foreground">
                          {it.category}
                        </span>
                      )}
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        {GOAL_LABEL[it.goal] ?? it.goal}
                      </span>
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        {LEVEL_LABEL[it.level] ?? it.level}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        <LocationIcon location={it.location} />
                        {LOCATION_LABEL[it.location] ?? it.location}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
