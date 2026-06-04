"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, PlayCircle, Info, Plus } from "lucide-react";
import { Input, Select, Badge, EmptyState, Button } from "@/components/ui";
import { hasExerciseDemo } from "@/lib/exercise-animation";
import { ExercisePreview } from "@/components/exercise-preview";
import { cn } from "@/lib/utils";

export type ExerciseItem = {
  id: string;
  nameDe: string;
  nameEn: string;
  muscleSlug: string;
  muscleName: string;
  equipmentSlug: string | null;
  equipmentName: string | null;
  mechanic: string;
  category: string;
  trackingType?: string;
  isCustom: boolean;
  instructions: string;
};

type Option = { slug: string; name: string };

export function ExerciseBrowser({
  items,
  muscles,
  equipment,
  selectable,
  onPick,
}: {
  items: ExerciseItem[];
  muscles: Option[];
  equipment: Option[];
  selectable?: boolean;
  onPick?: (item: ExerciseItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equip, setEquip] = useState("");
  // Vorschau-Overlay: zeigt Details ohne wegzunavigieren → Suche & Scroll bleiben.
  const [preview, setPreview] = useState<ExerciseItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (muscle && it.muscleSlug !== muscle) return false;
      if (equip && it.equipmentSlug !== equip) return false;
      if (q && !`${it.nameDe} ${it.nameEn}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, query, muscle, equip]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Übung suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            <option value="">Alle Muskeln</option>
            {muscles.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </Select>
          <Select value={equip} onChange={(e) => setEquip(e.target.value)}>
            <option value="">Alle Geräte</option>
            {equipment.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Übung gefunden"
          description="Passe Suche oder Filter an."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {filtered.map((it) => {
            const info = (
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  <span className="truncate">{it.nameDe}</span>
                  {hasExerciseDemo(it.nameEn) && (
                    <PlayCircle
                      className="size-4 shrink-0 text-primary"
                      aria-label="Mit Video-Anleitung"
                    />
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge className="bg-primary/15 text-primary">
                    {it.muscleName}
                  </Badge>
                  {it.equipmentName && <Badge>{it.equipmentName}</Badge>}
                  {it.isCustom && (
                    <Badge className="bg-success/15 text-success">Eigene</Badge>
                  )}
                </div>
              </div>
            );

            if (selectable) {
              // Zeile antippen = zum Workout hinzufügen; Info-Button = Detailansicht.
              return (
                <li key={it.id} className="flex items-center hover:bg-surface-2">
                  <button
                    onClick={() => onPick?.(it)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                    aria-label={`${it.nameDe} zum Workout hinzufügen`}
                  >
                    {info}
                    <Plus className="ml-auto size-5 shrink-0 text-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(it)}
                    aria-label={`${it.nameDe} – Details ansehen`}
                    className="flex size-12 shrink-0 items-center justify-center border-l border-border text-muted transition-colors hover:text-foreground active:text-foreground"
                  >
                    <Info className="size-5" />
                  </button>
                </li>
              );
            }
            return (
              <li key={it.id}>
                <Link
                  href={`/exercises/${it.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  {info}
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className={cn("text-center text-xs text-muted")}>
        {filtered.length} von {items.length}
      </p>

      {/* Detail-Vorschau ohne Wegnavigieren (Suche/Scroll bleiben erhalten) */}
      <ExercisePreview
        item={preview}
        onClose={() => setPreview(null)}
        footer={
          selectable && preview ? (
            <Button
              className="w-full"
              onClick={() => {
                const it = preview;
                setPreview(null);
                onPick?.(it);
              }}
            >
              <Plus className="size-4" /> Zum Workout hinzufügen
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
