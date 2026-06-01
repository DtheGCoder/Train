"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  Plus,
  Trash2,
  X,
  Timer,
  Dumbbell,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui";
import { ExerciseBrowser, type ExerciseItem } from "@/components/exercise-browser";
import { RestTimer } from "@/components/rest-timer";
import { CoachCard, type CoachReaction } from "@/components/coach-card";
import { setTypeLabels, setTypeShort } from "@/lib/labels";
import { formatDuration, cn } from "@/lib/utils";
import {
  type CoachProfile,
  bestE1RM,
  recommendSet,
  autoregulate,
  liveReaction,
  repsForWeight,
  recommendedRest,
} from "@/lib/coach";
import {
  updateSet,
  addSet,
  deleteSet,
  addExerciseToWorkout,
  removeWorkoutExercise,
  finishWorkout,
  discardWorkout,
} from "@/lib/actions";

type SetState = {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  setType: string;
  isCompleted: boolean;
};
type ExState = {
  id: string;
  exerciseId: string;
  name: string;
  muscleName: string;
  sets: SetState[];
};
type Initial = {
  id: string;
  name: string;
  startedAt: string;
  exercises: ExState[];
};

const setTypeCycle = ["normal", "warmup", "dropset", "failure"];

export function WorkoutSession({
  initial,
  previous,
  pickerItems,
  muscles,
  equipment,
  coach,
}: {
  initial: Initial;
  previous: Record<string, { weight: number; reps: number }[]>;
  pickerItems: ExerciseItem[];
  muscles: { slug: string; name: string }[];
  equipment: { slug: string; name: string }[];
  coach: { profile: CoachProfile; baseline: Record<string, number> };
}) {
  const [exercises, setExercises] = useState<ExState[]>(initial.exercises);
  const [coachMsg, setCoachMsg] = useState<Record<string, CoachReaction>>({});
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [, startTransition] = useTransition();
  const [isFinishing, setIsFinishing] = useState(false);
  // Letzter getippter RPE-Wert je Satz (synchron, damit das Abhaken den
  // gerade eingegebenen Wert auswertet, bevor der State-Re-Render greift).
  const rpeRef = useRef<Record<string, number | null>>({});

  useEffect(() => {
    const start = new Date(initial.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [initial.startedAt]);

  const stats = useMemo(() => {
    let volume = 0;
    let completedSets = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted) {
          volume += s.weight * s.reps;
          completedSets++;
        }
      }
    }
    return { volume, completedSets };
  }, [exercises]);

  const patchSet = (
    exId: string,
    setId: string,
    patch: Partial<SetState>,
    persist = true,
  ) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s,
              ),
            },
      ),
    );
    if (persist) {
      startTransition(async () => {
        await updateSet(setId, {
          weight: patch.weight,
          reps: patch.reps,
          rpe: patch.rpe,
          setType: patch.setType,
          isCompleted: patch.isCompleted,
        });
      });
    }
  };

  // Live geschätztes 1RM: bestes aus Historie + abgeschlossenen Sätzen dieser
  // Einheit (optional inkl. eines gerade abgeschlossenen Satzes).
  const liveE1RM = (ex: ExState, extra?: SetState) => {
    const completed = ex.sets.filter((s) => s.isCompleted);
    const all = extra ? [...completed, extra] : completed;
    return Math.max(
      coach.baseline[ex.exerciseId] ?? 0,
      bestE1RM(all.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe }))),
    );
  };

  const setReaction = (exId: string, r: CoachReaction) =>
    setCoachMsg((prev) => ({ ...prev, [exId]: r }));

  const reactToWeight = (ex: ExState, weight: number) => {
    if (weight <= 0) return;
    const r = liveReaction(weight, liveE1RM(ex), coach.profile);
    if (r) setReaction(ex.id, r);
  };

  const handleLimitTest = (ex: ExState) => {
    const oneRm = liveE1RM(ex);
    const rec = recommendSet(oneRm, coach.profile);
    if (!rec.hasBaseline) return;
    const pred = repsForWeight(oneRm, rec.weight);
    setReaction(ex.id, {
      tone: "limit",
      message: `Limit-Test: ${rec.weight} kg, so viele saubere Wdh wie möglich. Ich tippe auf ${pred}+ — überrasch mich.`,
    });
  };

  const toggleComplete = (ex: ExState, s: SetState) => {
    const next = !s.isCompleted;
    // Frisch getippten RPE bevorzugen (Ref ist synchron), sonst State-Wert.
    const rpe = s.id in rpeRef.current ? rpeRef.current[s.id] : s.rpe;
    patchSet(ex.id, s.id, next ? { isCompleted: next, rpe } : { isCompleted: next });
    if (next) {
      // Coach wertet den Satz aus (Grenze ggf. nach oben verschieben).
      const priorE1RM = liveE1RM(ex);
      const adj = autoregulate(
        { weight: s.weight, reps: s.reps, rpe },
        priorE1RM,
        coach.profile,
      );
      setReaction(ex.id, { tone: adj.tone, message: adj.message });
      // Rest-Timer mit vom Coach empfohlener Pause (Ziel/Stil-abhängig).
      setRestSeconds(recommendedRest(coach.profile));
      setRestKey((k) => k + 1);
    }
  };

  const cycleType = (ex: ExState, s: SetState) => {
    const idx = setTypeCycle.indexOf(s.setType);
    const next = setTypeCycle[(idx + 1) % setTypeCycle.length];
    patchSet(ex.id, s.id, { setType: next });
  };

  const handleAddSet = (ex: ExState) => {
    startTransition(async () => {
      const created = await addSet(ex.id);
      setExercises((prev) =>
        prev.map((e) =>
          e.id !== ex.id
            ? e
            : {
                ...e,
                sets: [
                  ...e.sets,
                  {
                    id: created.id,
                    setNumber: created.setNumber,
                    weight: created.weight,
                    reps: created.reps,
                    rpe: created.rpe,
                    setType: created.setType,
                    isCompleted: created.isCompleted,
                  },
                ],
              },
        ),
      );
    });
  };

  const handleDeleteSet = (ex: ExState, setId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id !== ex.id
          ? e
          : { ...e, sets: e.sets.filter((s) => s.id !== setId) },
      ),
    );
    startTransition(async () => {
      await deleteSet(setId);
    });
  };

  const handleRemoveExercise = (exId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
    startTransition(async () => {
      await removeWorkoutExercise(exId);
    });
  };

  const handlePick = (item: ExerciseItem) => {
    setShowPicker(false);
    startTransition(async () => {
      const created = await addExerciseToWorkout(initial.id, item.id);
      setExercises((prev) => [
        ...prev,
        {
          id: created.id,
          exerciseId: created.exerciseId,
          name: item.nameDe,
          muscleName: item.muscleName,
          sets: created.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            setType: s.setType,
            isCompleted: s.isCompleted,
          })),
        },
      ]);
    });
  };

  const handleFinish = () => {
    setIsFinishing(true);
    startTransition(async () => {
      await finishWorkout(initial.id);
    });
  };

  const handleDiscard = () => {
    if (!confirm("Workout wirklich verwerfen? Alle Sätze gehen verloren.")) return;
    startTransition(async () => {
      await discardWorkout(initial.id);
    });
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Kopf mit Live-Stats */}
      <div className="sticky top-0 z-20 -mx-4 -mt-[env(safe-area-inset-top)] border-b border-border bg-background/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{initial.name}</h1>
            <div className="mt-0.5 flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3.5" /> {formatDuration(elapsed)}
              </span>
              <span>{Math.round(stats.volume)} kg Vol.</span>
              <span>{stats.completedSets} Sätze</span>
            </div>
          </div>
          <Button onClick={handleFinish} disabled={isFinishing} className="shrink-0">
            <Flag className="size-4" /> Beenden
          </Button>
        </div>
      </div>

      {exercises.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">
          Noch keine Übungen. Füge unten welche hinzu.
        </div>
      )}

      {exercises.map((ex) => {
        const prev = previous[ex.exerciseId];
        return (
          <div key={ex.id} className="rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{ex.name}</p>
                <p className="text-xs text-muted">{ex.muscleName}</p>
                {prev && prev.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    Letztes Mal:{" "}
                    <span className="font-mono tabular-nums text-foreground/70">
                      {prev.map((p) => `${p.weight}×${p.reps}`).join(", ")}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemoveExercise(ex.id)}
                className="-mr-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger active:bg-surface-2"
                aria-label="Übung entfernen"
              >
                <Trash2 className="size-5" />
              </button>
            </div>

            <div className="px-2 py-2">
              <CoachCard
                rec={recommendSet(liveE1RM(ex), coach.profile)}
                reaction={coachMsg[ex.id] ?? null}
                oneRm={liveE1RM(ex)}
                onLimitTest={() => handleLimitTest(ex)}
              />

              {/* Spaltenkopf */}
              <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_3rem] items-center gap-2 px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                <span>Satz</span>
                <span className="text-center">kg</span>
                <span className="text-center">Wdh.</span>
                <span className="text-center">RPE</span>
                <span className="text-center">✓</span>
              </div>

              {ex.sets.map((s, i) => {
                const p = prev?.[i];
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "group grid grid-cols-[2.5rem_1fr_1fr_1fr_3rem] items-center gap-2 rounded-lg px-2 py-1.5",
                      s.isCompleted && "bg-success/10",
                    )}
                  >
                    <button
                      onClick={() => cycleType(ex, s)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md text-sm font-bold active:scale-95",
                        s.setType === "warmup" && "bg-amber-500/20 text-amber-400",
                        s.setType === "dropset" && "bg-purple-500/20 text-purple-400",
                        s.setType === "failure" && "bg-danger/20 text-danger",
                        s.setType === "normal" && "bg-surface-2 text-muted",
                      )}
                      title={setTypeLabels[s.setType]}
                    >
                      {setTypeShort[s.setType] || s.setNumber}
                    </button>

                    <input
                      type="number"
                      inputMode="decimal"
                      defaultValue={s.weight || ""}
                      placeholder={p ? String(p.weight) : "0"}
                      onBlur={(e) => {
                        const weight = parseFloat(e.target.value) || 0;
                        patchSet(ex.id, s.id, { weight });
                        if (!s.isCompleted) reactToWeight(ex, weight);
                      }}
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-center text-base outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      defaultValue={s.reps || ""}
                      placeholder={p ? String(p.reps) : "0"}
                      onBlur={(e) =>
                        patchSet(ex.id, s.id, {
                          reps: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-center text-base outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={1}
                      max={10}
                      defaultValue={s.rpe ?? ""}
                      placeholder="–"
                      title="RPE: gefühlte Anstrengung 1–10 (optional). Hilft dem Coach, die Last anzupassen."
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        rpeRef.current[s.id] = Number.isFinite(v)
                          ? Math.min(10, Math.max(1, v))
                          : null;
                      }}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        patchSet(ex.id, s.id, {
                          rpe: Number.isFinite(v)
                            ? Math.min(10, Math.max(1, v))
                            : null,
                        });
                      }}
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-1 text-center text-base outline-none focus:border-primary placeholder:text-muted/50"
                    />

                    <button
                      onClick={() => toggleComplete(ex, s)}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-md transition-colors active:scale-95",
                        s.isCompleted
                          ? "bg-success text-white"
                          : "bg-surface-2 text-muted hover:text-foreground",
                      )}
                      aria-label="Satz abschließen"
                    >
                      <Check className="size-5" />
                    </button>
                  </div>
                );
              })}

              <div className="flex gap-2 px-2 pt-2">
                <button
                  onClick={() => handleAddSet(ex)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-surface-2 text-sm font-medium text-muted hover:text-foreground active:bg-border"
                >
                  <Plus className="size-4" /> Satz
                </button>
                {ex.sets.length > 0 && (
                  <button
                    onClick={() =>
                      handleDeleteSet(ex, ex.sets[ex.sets.length - 1].id)
                    }
                    className="flex min-h-11 items-center justify-center rounded-lg bg-surface-2 px-4 text-sm text-muted hover:text-danger active:bg-border"
                    aria-label="Letzten Satz entfernen"
                  >
                    <Minus />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Aktionen */}
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => setShowPicker(true)}>
          <Dumbbell className="size-4" /> Übung hinzufügen
        </Button>
        <Button variant="danger" onClick={handleDiscard}>
          <Trash2 className="size-4" /> Workout verwerfen
        </Button>
      </div>

      {/* Rest-Timer */}
      {restSeconds !== null && (
        <RestTimer
          key={restKey}
          seconds={restSeconds}
          onClose={() => setRestSeconds(null)}
        />
      )}

      {/* Übungs-Picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <h2 className="font-semibold">Übung wählen</h2>
            <button
              onClick={() => setShowPicker(false)}
              className="-mr-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 active:bg-surface-2"
              aria-label="Schließen"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <ExerciseBrowser
              items={pickerItems}
              muscles={muscles}
              equipment={equipment}
              selectable
              onPick={handlePick}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Minus() {
  return <span className="text-lg leading-none">−</span>;
}
