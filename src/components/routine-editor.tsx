"use client";

import { useState, useTransition } from "react";
import { Play, Trash2, X, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui";
import { ExerciseBrowser, type ExerciseItem } from "@/components/exercise-browser";
import {
  addRoutineExercise,
  removeRoutineExercise,
  updateRoutineExercise,
  deleteRoutine,
  startWorkout,
} from "@/lib/actions";

type REx = {
  id: string;
  name: string;
  muscleName: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetRestSec: number;
};

export function RoutineEditor({
  routineId,
  name,
  exercises,
  pickerItems,
  muscles,
  equipment,
}: {
  routineId: string;
  name: string;
  exercises: REx[];
  pickerItems: ExerciseItem[];
  muscles: { slug: string; name: string }[];
  equipment: { slug: string; name: string }[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [, startTransition] = useTransition();

  const onPick = (item: ExerciseItem) => {
    setShowPicker(false);
    startTransition(async () => {
      await addRoutineExercise(routineId, item.id);
    });
  };

  const onRemove = (id: string) => {
    startTransition(async () => {
      await removeRoutineExercise(id, routineId);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <form action={startWorkout.bind(null, routineId)}>
          <Button type="submit" disabled={exercises.length === 0}>
            <Play className="size-4" /> Starten
          </Button>
        </form>
      </div>

      {exercises.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
          Noch keine Übungen. Füge unten welche hinzu.
        </div>
      ) : (
        <ul className="space-y-3">
          {exercises.map((re) => (
            <li
              key={re.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{re.name}</p>
                  <p className="text-xs text-muted">{re.muscleName}</p>
                </div>
                <button
                  onClick={() => onRemove(re.id)}
                  className="rounded-lg p-2 text-muted hover:text-danger"
                  aria-label="Entfernen"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Sätze"
                  defaultValue={re.targetSets}
                  onCommit={(v) =>
                    startTransition(() =>
                      updateRoutineExercise(re.id, routineId, { targetSets: v }),
                    )
                  }
                />
                <Field
                  label="Wdh."
                  defaultValue={re.targetReps}
                  onCommit={(v) =>
                    startTransition(() =>
                      updateRoutineExercise(re.id, routineId, { targetReps: v }),
                    )
                  }
                />
                <Field
                  label="Gewicht (kg)"
                  defaultValue={re.targetWeight}
                  float
                  onCommit={(v) =>
                    startTransition(() =>
                      updateRoutineExercise(re.id, routineId, { targetWeight: v }),
                    )
                  }
                />
                <Field
                  label="Pause (s)"
                  defaultValue={re.targetRestSec}
                  onCommit={(v) =>
                    startTransition(() =>
                      updateRoutineExercise(re.id, routineId, {
                        targetRestSec: v,
                      }),
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => setShowPicker(true)}>
          <Dumbbell className="size-4" /> Übung hinzufügen
        </Button>
        <form action={deleteRoutine.bind(null, routineId)}>
          <Button variant="danger" type="submit" className="w-full">
            <Trash2 className="size-4" /> Plan löschen
          </Button>
        </form>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Übung wählen</h2>
            <button
              onClick={() => setShowPicker(false)}
              className="rounded-lg p-2 text-muted hover:bg-surface-2"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ExerciseBrowser
              items={pickerItems}
              muscles={muscles}
              equipment={equipment}
              selectable
              onPick={onPick}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onCommit,
  float = false,
}: {
  label: string;
  defaultValue: number;
  onCommit: (v: number) => void;
  float?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode={float ? "decimal" : "numeric"}
        step={float ? "0.5" : "1"}
        defaultValue={defaultValue}
        onBlur={(e) =>
          onCommit((float ? parseFloat(e.target.value) : parseInt(e.target.value)) || 0)
        }
        className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-center text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
