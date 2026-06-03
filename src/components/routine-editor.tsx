"use client";

import { useRef, useState, useTransition } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui";
import { ExerciseBrowser, type ExerciseItem } from "@/components/exercise-browser";
import type { RoutineSet } from "@/lib/routine-sets";
import {
  addRoutineExercise,
  removeRoutineExercise,
  updateRoutineExercise,
  updateRoutineExerciseSets,
  reorderRoutineExercises,
  improveRoutine,
  deleteRoutine,
  startWorkout,
} from "@/lib/actions";

type REx = {
  id: string;
  name: string;
  muscleName: string;
  sets: RoutineSet[];
  targetRestSec: number;
};

const GAP = 12; // entspricht space-y-3 (0.75rem)

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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

  // Lokale (optimistische) Kopie. Wird neu gesetzt, wenn sich die Server-Daten
  // ändern (Signatur über IDs, Sätze und Pause) — das von React empfohlene
  // Muster „State aus Props ableiten" über einen Vergleichs-State.
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

  // --- Drag & Drop ---------------------------------------------------------
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTranslate, setDragTranslate] = useState(0);
  // Arbeits-Order während des Ziehens (nur in Event-Handlern angefasst).
  const drag = useRef<{
    grabOffset: number;
    heights: number[];
    listTop: number;
    order: REx[];
  } | null>(null);

  function slotTop(heights: number[], idx: number, base: number): number {
    let top = base;
    for (let i = 0; i < idx; i++) top += heights[i] + GAP;
    return top;
  }

  const onHandleDown = (e: React.PointerEvent, id: string) => {
    const li = itemRefs.current.get(id);
    const list = listRef.current;
    if (!li || !list || order.length < 2) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const liRect = li.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const heights = order.map(
      (re) => itemRefs.current.get(re.id)?.getBoundingClientRect().height ?? 0,
    );
    drag.current = {
      grabOffset: e.clientY - liRect.top,
      heights,
      listTop: listRect.top,
      order: order.slice(),
    };
    setDragId(id);
    setDragTranslate(0);
  };

  const onHandleMove = (e: React.PointerEvent) => {
    const st = drag.current;
    if (!st || !dragId) return;
    const cur = st.order;
    const dragIdx = cur.findIndex((r) => r.id === dragId);
    if (dragIdx < 0) return;
    const pointerTop = e.clientY - st.grabOffset;
    const center = pointerTop + st.heights[dragIdx] / 2;

    let acc = st.listTop;
    let target = cur.length - 1;
    for (let i = 0; i < cur.length; i++) {
      const slotCenter = acc + st.heights[i] / 2;
      if (center < slotCenter) {
        target = i;
        break;
      }
      acc += st.heights[i] + GAP;
    }

    let finalIdx = dragIdx;
    if (target !== dragIdx) {
      st.order = move(cur, dragIdx, target);
      st.heights = move(st.heights, dragIdx, target);
      setOrder(st.order);
      finalIdx = target;
    }
    setDragTranslate(pointerTop - slotTop(st.heights, finalIdx, st.listTop));
  };

  const onHandleUp = () => {
    if (!drag.current) return;
    const ids = drag.current.order.map((r) => r.id);
    drag.current = null;
    setDragId(null);
    setDragTranslate(0);
    startTransition(() => reorderRoutineExercises(routineId, ids));
  };

  // --- Sätze ---------------------------------------------------------------
  // Optimistisch updaten und die neuen Sätze direkt persistieren.
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

  const commitSets = (exId: string, sets: RoutineSet[]) => {
    startTransition(() => updateRoutineExerciseSets(exId, routineId, sets));
  };

  const setField = (
    exId: string,
    idx: number,
    field: "reps" | "weight",
    value: number,
  ) => {
    applySets(exId, (sets) =>
      sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

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

  // --- Picker / Verbessern -------------------------------------------------
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

  const [improveMsgs, setImproveMsgs] = useState<string[] | null>(null);
  const [improving, startImprove] = useTransition();
  const onImprove = () => {
    startImprove(async () => {
      const res = await improveRoutine(routineId);
      setImproveMsgs(res.messages);
    });
  };

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
        <ul ref={listRef} className="space-y-3">
          {order.map((re) => {
            const dragging = re.id === dragId;
            return (
              <li
                key={re.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(re.id, el);
                  else itemRefs.current.delete(re.id);
                }}
                style={
                  dragging
                    ? {
                        transform: `translateY(${dragTranslate}px) scale(1.02)`,
                        zIndex: 50,
                        position: "relative",
                      }
                    : undefined
                }
                className={`rounded-xl border bg-surface p-4 ${
                  dragging
                    ? "border-primary/60 shadow-lg shadow-black/30"
                    : "border-border"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onPointerDown={(e) => onHandleDown(e, re.id)}
                    onPointerMove={onHandleMove}
                    onPointerUp={onHandleUp}
                    onPointerCancel={onHandleUp}
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
                    onClick={() => onRemove(re.id)}
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
                          setField(
                            re.id,
                            idx,
                            "weight",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        onBlur={() => commitSets(re.id, re.sets)}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-center text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        defaultValue={s.reps}
                        onChange={(e) =>
                          setField(
                            re.id,
                            idx,
                            "reps",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        onBlur={() => commitSets(re.id, re.sets)}
                        className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-center text-sm outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => removeSet(re.id, idx)}
                        disabled={re.sets.length <= 1}
                        className="flex items-center justify-center rounded-md p-1.5 text-muted hover:text-danger disabled:opacity-30"
                        aria-label="Satz entfernen"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSet(re.id)}
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
                    onBlur={(e) =>
                      startTransition(() =>
                        updateRoutineExercise(re.id, routineId, {
                          targetRestSec: parseInt(e.target.value) || 0,
                        }),
                      )
                    }
                    className="w-24 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-center text-sm outline-none focus:border-primary"
                  />
                </label>
              </li>
            );
          })}
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
