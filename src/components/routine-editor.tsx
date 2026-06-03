"use client";

import { useState, useTransition } from "react";
import {
  Play,
  Trash2,
  X,
  Dumbbell,
  GripVertical,
  Plus,
  Sparkles,
  Loader2,
  Wand2,
  Repeat,
  Info,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui";
import { ExerciseBrowser, type ExerciseItem } from "@/components/exercise-browser";
import {
  ExercisePreview,
  type PreviewExercise,
} from "@/components/exercise-preview";
import type { RoutineSet } from "@/lib/routine-sets";
import {
  addRoutineExercise,
  removeRoutineExercise,
  replaceRoutineExercise,
  updateRoutineExercise,
  updateRoutineExerciseSets,
  reorderRoutineExercises,
  improveRoutine,
  deleteRoutine,
  startWorkout,
} from "@/lib/actions";

type REx = {
  id: string;
  exerciseId: string;
  name: string;
  nameEn: string;
  muscleName: string;
  equipmentName: string | null;
  mechanic: string;
  category: string;
  instructions: string;
  sets: RoutineSet[];
  targetRestSec: number;
};

function toPreview(re: REx): PreviewExercise {
  return {
    id: re.exerciseId,
    nameDe: re.name,
    nameEn: re.nameEn,
    muscleName: re.muscleName,
    equipmentName: re.equipmentName,
    mechanic: re.mechanic,
    category: re.category,
    instructions: re.instructions,
  };
}

type PickerMode = { mode: "add" } | { mode: "replace"; exId: string };

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
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [, startTransition] = useTransition();

  // Lokale (optimistische) Kopie. Wird neu gesetzt, wenn sich die Server-Daten
  // ändern (Signatur über IDs, Sätze und Pause) — empfohlenes Muster „State aus
  // Props ableiten" über einen Vergleichs-State.
  const [order, setOrder] = useState<REx[]>(exercises);
  const sig = exercises
    .map(
      (e) =>
        `${e.id}:${e.targetRestSec}:${e.sets
          .map((s) => `${s.reps}x${s.weight}`)
          .join("|")}`,
    )
    .join(",");
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setOrder(exercises);
  }

  // --- Drag & Drop (dnd-kit) ----------------------------------------------
  const sensors = useSensors(
    // Maus/Stift: kleiner Schwellwert, damit Klicks auf Felder nicht ziehen.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch: kurzes Halten startet das Ziehen (sonst kollidiert es mit Scroll).
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((r) => r.id === active.id);
    const newIndex = order.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    startTransition(() =>
      reorderRoutineExercises(routineId, next.map((r) => r.id)),
    );
  };

  // --- Sätze ---------------------------------------------------------------
  // Optimistisch updaten; gibt die neuen Sätze für das anschließende Speichern.
  const applySets = (exId: string, fn: (sets: RoutineSet[]) => RoutineSet[]) => {
    let nextSets: RoutineSet[] | null = null;
    setOrder((prev) =>
      prev.map((re) => {
        if (re.id !== exId) return re;
        nextSets = fn(re.sets);
        return { ...re, sets: nextSets };
      }),
    );
    return nextSets;
  };

  const commitSets = (exId: string, sets: RoutineSet[]) =>
    startTransition(() => updateRoutineExerciseSets(exId, routineId, sets));

  const setField = (
    exId: string,
    idx: number,
    field: "reps" | "weight",
    value: number,
  ) =>
    applySets(exId, (sets) =>
      sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );

  const addSet = (exId: string) => {
    const next = applySets(exId, (sets) => {
      const last = sets[sets.length - 1] ?? { reps: 10, weight: 0 };
      return [...sets, { ...last }];
    });
    if (next) commitSets(exId, next);
  };

  const removeSet = (exId: string, idx: number) => {
    const next = applySets(exId, (sets) =>
      sets.length <= 1 ? sets : sets.filter((_, i) => i !== idx),
    );
    if (next) commitSets(exId, next);
  };

  const updateRest = (exId: string, sec: number) =>
    startTransition(() =>
      updateRoutineExercise(exId, routineId, { targetRestSec: sec }),
    );

  // --- Picker / Verbessern -------------------------------------------------
  const onRemove = (id: string) =>
    startTransition(async () => {
      await removeRoutineExercise(id, routineId);
    });

  const onPick = (item: ExerciseItem) => {
    const p = picker;
    setPicker(null);
    startTransition(async () => {
      if (p?.mode === "replace") {
        await replaceRoutineExercise(p.exId, routineId, item.id);
      } else {
        await addRoutineExercise(routineId, item.id);
      }
    });
  };

  const [improveMsgs, setImproveMsgs] = useState<string[] | null>(null);
  const [improving, startImprove] = useTransition();
  const onImprove = () =>
    startImprove(async () => {
      const res = await improveRoutine(routineId);
      setImproveMsgs(res.messages);
    });

  // Übungs-Vorschau (Video & Details) – direkt im Plan, ohne wegzunavigieren.
  const [preview, setPreview] = useState<PreviewExercise | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <form action={startWorkout.bind(null, routineId)}>
          <Button type="submit" disabled={order.length === 0}>
            <Play className="size-4" /> Starten
          </Button>
        </form>
      </div>

      {/* Verbessern: Coach ordnet/ergänzt nach Trainingsregeln */}
      {order.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onImprove}
            disabled={improving}
          >
            {improving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Mit Coach verbessern
          </Button>
          {improveMsgs && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-semibold text-primary">
                  Coach-Vorschläge
                </p>
                <button
                  onClick={() => setImproveMsgs(null)}
                  className="ml-auto rounded p-1 text-muted hover:text-foreground"
                  aria-label="Schließen"
                >
                  <X className="size-4" />
                </button>
              </div>
              <ul className="space-y-1.5">
                {improveMsgs.map((m, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs leading-snug text-muted"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {order.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
          Noch keine Übungen. Füge unten welche hinzu.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={order.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">
              {order.map((re) => (
                <SortableExercise
                  key={re.id}
                  re={re}
                  onRemove={() => onRemove(re.id)}
                  onSwap={() => setPicker({ mode: "replace", exId: re.id })}
                  onInfo={() => setPreview(toPreview(re))}
                  onSetField={setField}
                  onCommitSets={commitSets}
                  onAddSet={() => addSet(re.id)}
                  onRemoveSet={(idx) => removeSet(re.id, idx)}
                  onUpdateRest={(sec) => updateRest(re.id, sec)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => setPicker({ mode: "add" })}>
          <Dumbbell className="size-4" /> Übung hinzufügen
        </Button>
        <form action={deleteRoutine.bind(null, routineId)}>
          <Button variant="danger" type="submit" className="w-full">
            <Trash2 className="size-4" /> Plan löschen
          </Button>
        </form>
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">
              {picker.mode === "replace" ? "Übung austauschen" : "Übung wählen"}
            </h2>
            <button
              onClick={() => setPicker(null)}
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

      <ExercisePreview item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

// Eine sortierbare Übungs-Karte. Drag startet nur am Griff (listeners dort),
// damit die Eingabefelder normal bedienbar bleiben.
function SortableExercise({
  re,
  onRemove,
  onSwap,
  onInfo,
  onSetField,
  onCommitSets,
  onAddSet,
  onRemoveSet,
  onUpdateRest,
}: {
  re: REx;
  onRemove: () => void;
  onSwap: () => void;
  onInfo: () => void;
  onSetField: (
    exId: string,
    idx: number,
    field: "reps" | "weight",
    value: number,
  ) => void;
  onCommitSets: (exId: string, sets: RoutineSet[]) => void;
  onAddSet: () => void;
  onRemoveSet: (idx: number) => void;
  onUpdateRest: (sec: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: re.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-xl border bg-surface p-4 ${
        isDragging
          ? "z-50 border-primary/60 opacity-90 shadow-lg shadow-black/40"
          : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="-ml-1 cursor-grab touch-none rounded-lg p-1.5 text-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Verschieben"
        >
          <GripVertical className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{re.name}</p>
          <p className="text-xs text-muted">{re.muscleName}</p>
        </div>
        <button
          onClick={onInfo}
          className="rounded-lg p-2 text-muted hover:text-primary"
          aria-label="Video & Details"
        >
          <Info className="size-4" />
        </button>
        <button
          onClick={onSwap}
          className="rounded-lg p-2 text-muted hover:text-primary"
          aria-label="Übung austauschen"
        >
          <Repeat className="size-4" />
        </button>
        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-muted hover:text-danger"
          aria-label="Entfernen"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Individuelle Sätze */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted">
          <span>Satz</span>
          <span className="text-center">Gewicht (kg)</span>
          <span className="text-center">Wdh.</span>
          <span />
        </div>
        {re.sets.map((s, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"
          >
            <span className="text-center text-sm font-medium text-muted">
              {idx + 1}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              defaultValue={s.weight}
              onChange={(e) =>
                onSetField(re.id, idx, "weight", parseFloat(e.target.value) || 0)
              }
              onBlur={() => onCommitSets(re.id, re.sets)}
              className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-center text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              inputMode="numeric"
              step="1"
              defaultValue={s.reps}
              onChange={(e) =>
                onSetField(re.id, idx, "reps", parseInt(e.target.value) || 0)
              }
              onBlur={() => onCommitSets(re.id, re.sets)}
              className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-center text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => onRemoveSet(idx)}
              disabled={re.sets.length <= 1}
              className="flex items-center justify-center rounded-md p-1.5 text-muted hover:text-danger disabled:opacity-30"
              aria-label="Satz entfernen"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddSet}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-xs text-muted hover:border-primary hover:text-primary"
        >
          <Plus className="size-3.5" /> Satz hinzufügen
        </button>
      </div>

      {/* Pause pro Übung */}
      <label className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted">
          Pause (s)
        </span>
        <input
          type="number"
          inputMode="numeric"
          step="5"
          defaultValue={re.targetRestSec}
          onBlur={(e) => onUpdateRest(parseInt(e.target.value) || 0)}
          className="w-24 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-center text-sm outline-none focus:border-primary"
        />
      </label>
    </li>
  );
}
