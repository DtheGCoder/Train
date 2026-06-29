"use client";

import Link from "next/link";
import { X, PlayCircle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { getExerciseDemo } from "@/lib/exercise-animation";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { mechanicLabels, categoryLabels } from "@/lib/labels";
import type { TopLifter } from "@/lib/exercise-leaders";
import { cn } from "@/lib/utils";

// Minimal-Datensatz, den die Vorschau braucht. ExerciseItem (Browser) erfüllt
// das strukturell, daher kein Import nötig (vermeidet Zyklen).
export type PreviewExercise = {
  id: string; // exerciseId – für „volle Detailseite"
  nameDe: string;
  nameEn: string;
  muscleName: string;
  equipmentName: string | null;
  mechanic: string;
  category: string;
  instructions: string;
  topLifters?: TopLifter[];
};

const PLACE = [
  { ring: "ring-amber-400/80", text: "text-amber-400", medal: "🥇" },
  { ring: "ring-slate-300/80", text: "text-slate-300", medal: "🥈" },
  { ring: "ring-amber-700/80", text: "text-amber-700", medal: "🥉" },
];
const fmtKg = (n: number) => Math.round(n).toLocaleString("de-DE");

// Wiederverwendbares Vollbild-Overlay: zeigt Bewegungs-Demo (Video), Badges und
// Ausführung – ohne wegzunavigieren. Wird im Übungs-Browser, im Plan-Editor und
// im aktiven Workout genutzt. Optionaler Footer (z. B. „Zum Workout hinzufügen").
export function ExercisePreview({
  item,
  onClose,
  footer,
}: {
  item: PreviewExercise | null;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!item) return null;
  const demo = getExerciseDemo(item.nameEn);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{item.nameDe}</h2>
          <p className="truncate text-xs text-muted">{item.nameEn}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground active:bg-surface-2"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/15 text-primary">{item.muscleName}</Badge>
          {item.equipmentName && <Badge>{item.equipmentName}</Badge>}
          <Badge>{mechanicLabels[item.mechanic] ?? item.mechanic}</Badge>
          <Badge>{categoryLabels[item.category] ?? item.category}</Badge>
        </div>

        {item.topLifters && item.topLifters.length > 0 && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Trophy className="size-3.5" /> Top 3 · meiste kg
            </p>
            <ul className="space-y-1.5">
              {item.topLifters.map((l, i) => {
                const p = PLACE[i] ?? PLACE[2];
                const weighted = l.kg > 0;
                return (
                  <li
                    key={i}
                    className="lift-pop flex items-center gap-2.5"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="w-5 shrink-0 text-center text-sm">
                      {p.medal}
                    </span>
                    <Avatar
                      src={l.avatar}
                      name={l.name}
                      className={cn(
                        "size-7 text-[10px] ring-1 ring-offset-1 ring-offset-surface",
                        p.ring,
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {l.name}
                    </span>
                    <span
                      className={cn("shrink-0 text-sm font-extrabold tabular-nums", p.text)}
                    >
                      {weighted ? `${fmtKg(l.kg)} kg` : `${l.reps} Wdh`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {demo ? (
          <ExerciseAnimation frames={demo.frames} />
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
            <PlayCircle className="size-5 shrink-0" />
            Für diese Übung gibt es noch keine Bewegungs-Demo.
          </div>
        )}

        {item.instructions && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-1 text-sm font-semibold">Ausführung</h3>
            <p className="text-sm leading-relaxed text-muted">
              {item.instructions}
            </p>
          </div>
        )}

        <Link
          href={`/exercises/${item.id}`}
          className="block text-center text-sm font-medium text-primary hover:underline"
        >
          Volle Detailseite öffnen →
        </Link>
      </div>

      {footer && (
        <div className="border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}
