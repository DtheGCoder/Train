"use client";

import Link from "next/link";
import { X, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui";
import { getExerciseDemo } from "@/lib/exercise-animation";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { mechanicLabels, categoryLabels } from "@/lib/labels";

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
};

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
