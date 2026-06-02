"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type PointerEvent as RPointerEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import {
  Check,
  Plus,
  Trash2,
  X,
  Timer,
  Dumbbell,
  Flag,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ExerciseBrowser, type ExerciseItem } from "@/components/exercise-browser";
import { RestTimer } from "@/components/rest-timer";
import { CoachCard, type CoachReaction } from "@/components/coach-card";
import { setTypeLabels, setTypeShort } from "@/lib/labels";
import { formatDuration, cn } from "@/lib/utils";
import {
  type CoachProfile,
  type ExerciseHistory,
  type SessionState,
  bestE1RM,
  recommendSet,
  recommendNextSet,
  coachAfterSet,
  analyzeExerciseHistory,
  liveReaction,
  repsForWeight,
  recommendedRest,
  coachWorkoutSummary,
  type WorkoutSummary,
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
  history = {},
  pickerItems,
  muscles,
  equipment,
  coach,
}: {
  initial: Initial;
  previous: Record<string, { weight: number; reps: number }[]>;
  history?: Record<string, ExerciseHistory>;
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
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  // Abschluss-Übersicht: Coach-Fazit (Snapshot beim Beenden). Gespeichert wird
  // erst, wenn der Nutzer selbst auf „Zum Verlauf" tippt – so bleibt die
  // Übersicht offen, statt durch das Speichern sofort weggeleitet zu werden.
  const [finishSummary, setFinishSummary] = useState<WorkoutSummary | null>(null);
  const [finishSaving, setFinishSaving] = useState(false);
  // Letzter getippter RPE-Wert je Satz (synchron, damit das Abhaken den
  // gerade eingegebenen Wert auswertet, bevor der State-Re-Render greift).
  const rpeRef = useRef<Record<string, number | null>>({});
  // IDs frisch hinzugefügter Sätze/Übungen, die beim Erscheinen einblenden
  // sollen (Reveal). Bewusst nur das EXPLIZIT Hinzugefügte: bei einer neuen
  // Übung animiert die Karte als Ganzes, nicht zusätzlich jede Zeile darin.
  const [animSetIds, setAnimSetIds] = useState<Set<string>>(() => new Set());
  const [animExIds, setAnimExIds] = useState<Set<string>>(() => new Set());

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

  // Arbeitssätze (ohne Aufwärmsätze) einer Übung.
  const workingSetsOf = (ex: ExState) =>
    ex.sets.filter((s) => s.setType !== "warmup");

  // Übung gilt als erledigt, wenn alle gelisteten Arbeitssätze abgehakt sind.
  const isExerciseDone = (ex: ExState) => {
    const w = workingSetsOf(ex);
    return w.length > 0 && w.every((s) => s.isCompleted);
  };

  // Nächste noch offene Übung (in Reihenfolge ab der aktuellen, dann von vorn).
  const nextOpenExercise = (exId: string): ExState | null => {
    const idx = exercises.findIndex((e) => e.id === exId);
    if (idx < 0) return null;
    const order = [...exercises.slice(idx + 1), ...exercises.slice(0, idx)];
    return order.find((e) => !isExerciseDone(e)) ?? null;
  };

  // Verlaufs-Auswertung (Trend/Plateau) je Übung.
  const insightOf = (ex: ExState) => analyzeExerciseHistory(history[ex.exerciseId]);

  // Aktueller Session-Zustand der Übung: bereits abgehakte Arbeitssätze
  // (optional ohne einen bestimmten Satz, z. B. den gerade abgehakten).
  const sessionStateOf = (ex: ExState, excludeSetId?: string): SessionState => {
    const working = workingSetsOf(ex);
    const completed = working
      .filter((s) => s.isCompleted && s.id !== excludeSetId)
      .map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe }));
    return { completed, plannedSets: working.length };
  };

  const reactToWeight = (ex: ExState, weight: number) => {
    if (weight <= 0) return;
    const r = liveReaction(weight, liveE1RM(ex), coach.profile, {
      state: sessionStateOf(ex),
      insight: insightOf(ex),
    });
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
      // Voraussichtlicher Zustand der Übung NACH diesem Abhaken (State ist
      // asynchron, daher lokal nachbilden).
      const updatedEx: ExState = {
        ...ex,
        sets: ex.sets.map((x) =>
          x.id === s.id ? { ...x, isCompleted: true, rpe } : x,
        ),
      };
      if (isExerciseDone(updatedEx)) {
        // Alle geplanten Arbeitssätze sind erledigt: NICHT zum nächsten Satz
        // drängen, sondern zur nächsten Übung weiterleiten.
        const done = workingSetsOf(updatedEx).filter((x) => x.isCompleted).length;
        const nextEx = nextOpenExercise(ex.id);
        setReaction(ex.id, {
          tone: "done",
          message: nextEx
            ? `Stark — ${done} ${done === 1 ? "Satz" : "Sätze"} sauber durch. Diese Übung ist abgehakt. Weiter zu „${nextEx.name}“. (Willst du mehr, „+ Satz“.)`
            : `Stark — ${done} ${done === 1 ? "Satz" : "Sätze"} durch. Letzte Übung erledigt — Zeit, das Workout zu beenden.`,
        });
        // Pause nur, wenn es noch weitergeht.
        if (nextEx) {
          setRestSeconds(recommendedRest(coach.profile, { rpe }));
          setRestKey((k) => k + 1);
        }
      } else {
        // Coach wertet den Satz im Kontext aus: Verlauf (Trend/Plateau) +
        // bisherige Sätze dieser Einheit (Ermüdung), nicht stur „mehr".
        const priorE1RM = liveE1RM(ex);
        const adj = coachAfterSet(
          { weight: s.weight, reps: s.reps, rpe },
          priorE1RM,
          coach.profile,
          { state: sessionStateOf(ex, s.id), insight: insightOf(ex) },
        );
        setReaction(ex.id, { tone: adj.tone, message: adj.message });
        // Rest-Timer: Pause skaliert mit Ziel/Stil UND der Anstrengung (RPE).
        setRestSeconds(recommendedRest(coach.profile, { rpe }));
        setRestKey((k) => k + 1);
      }
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
      setAnimSetIds((prev) => new Set(prev).add(created.id));
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
      setAnimExIds((prev) => new Set(prev).add(created.id));
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
    if (isFinishing) return;

    // Coach-Fazit aus dem aktuellen Stand berechnen (Snapshot beim Beenden).
    const exSummaries = exercises
      .map((ex) => {
        const completed = workingSetsOf(ex).filter((s) => s.isCompleted);
        if (completed.length === 0) return null;
        const top = completed.reduce((a, b) => (b.weight > a.weight ? b : a));
        const sessionE1RM = bestE1RM(
          completed.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
        );
        return {
          name: ex.name,
          workSets: completed.length,
          topWeight: top.weight,
          topReps: top.reps,
          sessionE1RM,
          baselineE1RM: coach.baseline[ex.exerciseId] ?? 0,
          status: insightOf(ex).status,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    setFinishSummary(
      coachWorkoutSummary(
        {
          exercises: exSummaries,
          totalVolume: stats.volume,
          totalSets: stats.completedSets,
          durationSec: elapsed,
        },
        coach.profile,
      ),
    );
    setIsFinishing(true);
    // BEWUSST hier noch NICHT speichern: finishWorkout setzt finishedAt, was
    // die Workout-Seite serverseitig sofort auf /history umleiten würde – die
    // Übersicht wäre weg. Gespeichert wird erst beim Klick auf „Zum Verlauf".
  };

  const handleGoToHistory = () => {
    if (finishSaving) return;
    setFinishSaving(true);
    startTransition(async () => {
      await finishWorkout(initial.id);
      router.push(`/history/${initial.id}`);
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
      {/* Abschluss-Feier + Übersicht */}
      {isFinishing && (
        <FinishOverlay
          durationLabel={formatDuration(elapsed)}
          volume={stats.volume}
          sets={stats.completedSets}
          summary={finishSummary}
          saving={finishSaving}
          onContinue={handleGoToHistory}
        />
      )}

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
        const wsets = workingSetsOf(ex);
        const setsPlanned = wsets.length;
        const setsDone = wsets.filter((s) => s.isCompleted).length;
        const exDone = setsPlanned > 0 && setsDone === setsPlanned;
        const nextName = exDone ? (nextOpenExercise(ex.id)?.name ?? null) : null;
        return (
          <Reveal key={ex.id} animate={animExIds.has(ex.id)}>
          <div className="rounded-xl border border-border bg-surface">
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
                rec={recommendNextSet(liveE1RM(ex), coach.profile, {
                  state: sessionStateOf(ex),
                  insight: insightOf(ex),
                })}
                reaction={coachMsg[ex.id] ?? null}
                oneRm={liveE1RM(ex)}
                onLimitTest={() => handleLimitTest(ex)}
                done={exDone}
                nextExerciseName={nextName}
                setsDone={setsDone}
                setsPlanned={setsPlanned}
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
                  <Reveal key={s.id} animate={animSetIds.has(s.id)}>
                  <SwipeRow
                    onDelete={() => handleDeleteSet(ex, s.id)}
                    completed={s.isCompleted}
                  >
                    <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_3rem] items-center gap-2 px-2 py-1.5">
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
                  </SwipeRow>
                  </Reveal>
                );
              })}

              {ex.sets.length > 0 && (
                <p className="px-2 pt-1.5 text-[11px] text-muted/70">
                  Tipp: Satz nach links wischen zum Löschen.
                </p>
              )}

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
          </Reveal>
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

// Sanftes Einblenden für frisch hinzugefügte Sätze/Übungen: Höhe fährt von 0
// auf, dazu Fade + leichtes Hochgleiten. `animate=false` (vorhandene Elemente
// beim Laden) rendert ohne Animation. Respektiert prefers-reduced-motion.
function Reveal({
  children,
  animate,
  duration = 320,
}: {
  children: ReactNode;
  animate: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(!animate);
  const [maxH, setMaxH] = useState<number | undefined>(animate ? 0 : undefined);

  useEffect(() => {
    if (!animate) return;
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    const target = el ? el.scrollHeight : 0;
    // Im nächsten Frame öffnen, damit der 0-Startzustand sicher greift.
    const raf = requestAnimationFrame(() => {
      if (reduce) {
        setMaxH(undefined);
        setOpen(true);
        return;
      }
      setMaxH(target);
      setOpen(true);
    });
    // Nach der Animation auf „auto" freigeben (dynamische Inhalte/Größen).
    const t = window.setTimeout(
      () => setMaxH(undefined),
      reduce ? 0 : duration + 60,
    );
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [animate, duration]);

  return (
    <div
      ref={ref}
      style={{
        maxHeight: maxH,
        opacity: open ? 1 : 0,
        transform: open ? "none" : "translateY(-6px) scale(0.98)",
        overflow: maxH === undefined ? undefined : "hidden",
        transition: animate
          ? `max-height ${duration}ms cubic-bezier(0.22,1,0.36,1), opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(0.22,1,0.36,1)`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Vollbild-Übersicht beim Abschließen eines Workouts: aufploppender Erfolgs-
// Haken mit Ringen & Konfetti, eine kurze Statistik und das Coach-Fazit.
// Bleibt offen, bis der Nutzer selbst weiterklickt (nichts verschwindet von
// allein, damit man in Ruhe lesen kann).
function FinishOverlay({
  durationLabel,
  volume,
  sets,
  summary,
  saving,
  onContinue,
}: {
  durationLabel: string;
  volume: number;
  sets: number;
  summary: WorkoutSummary | null;
  saving: boolean;
  onContinue: () => void;
}) {
  const pieces = useMemo(() => {
    const colors = [
      "#6366f1",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#3b82f6",
      "#ec4899",
    ];
    // Deterministischer Pseudo-Zufall (sin-Hash) – stabil über Re-Renders und
    // ohne Math.random (rein, lint-konform), liefert aber gut gestreute Werte.
    const rand = (i: number, seed: number) => {
      const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 20 }, (_, i) => ({
      left: rand(i, 1) * 100,
      delay: rand(i, 2) * 0.35,
      duration: 1 + rand(i, 3) * 0.9,
      color: colors[i % colors.length],
      size: 6 + rand(i, 4) * 6,
    }));
  }, []);

  return (
    <div className="finish-overlay fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-background/95 px-6 py-10 backdrop-blur-sm">
      {/* Konfetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="finish-confetti absolute top-0 rounded-[2px]"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.4}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative my-auto flex w-full max-w-sm flex-col items-center">
        {/* Erfolgs-Haken mit Ringen */}
        <div className="relative flex size-28 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/30" />
          <span className="absolute inline-flex size-20 rounded-full bg-success/15" />
          <div className="finish-pop relative flex size-24 items-center justify-center rounded-full bg-success text-white shadow-lg shadow-success/40">
            <Check className="size-12" strokeWidth={3} />
          </div>
        </div>

        <div
          className="finish-rise mt-6 w-full text-center"
          style={{ animationDelay: "0.12s" }}
        >
          <p className="text-2xl font-bold">Geschafft! 💪</p>
          <p className="mt-1 text-sm text-muted">Workout abgeschlossen</p>

          <div className="mt-5 flex items-center justify-center gap-6 text-sm">
            <div>
              <p className="text-lg font-bold tabular-nums">{durationLabel}</p>
              <p className="text-xs text-muted">Dauer</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-lg font-bold tabular-nums">
                {Math.round(volume)} kg
              </p>
              <p className="text-xs text-muted">Volumen</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-lg font-bold tabular-nums">{sets}</p>
              <p className="text-xs text-muted">Sätze</p>
            </div>
          </div>

          {/* Coach-Fazit */}
          {summary && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-left">
              <div className="mb-2 flex items-center gap-2">
                <Dumbbell className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Dein Coach
                </span>
              </div>
              <p className="font-semibold">{summary.headline}</p>
              {summary.notes.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {summary.notes.map((n, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-muted"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Weiter – der Nutzer klickt selbst weiter (nichts verschwindet
              von allein). Erst hier wird gespeichert. */}
          <button
            type="button"
            onClick={onContinue}
            disabled={saving}
            className="mt-6 inline-flex min-h-12 w-full select-none items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:opacity-80 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> wird gespeichert…
              </>
            ) : (
              <>
                Zum Verlauf <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Wischbare Satz-Zeile: nach links ziehen, um den Satz zu löschen.
// Ab der Schwelle „rastet" es ein (Haptik), beim Loslassen wischt die Zeile
// raus und kollabiert sanft – sonst federt sie zurück. Vertikales Scrollen und
// das Tippen in die Felder bleiben unberührt (Geste rastet nur klar horizontal
// ein, und ein versehentlicher Tap nach dem Wischen wird unterdrückt).
const SWIPE_THRESHOLD = 88; // px bis zum Auslösen

function SwipeRow({
  children,
  onDelete,
  completed,
}: {
  children: ReactNode;
  onDelete: () => void;
  completed?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const engaged = useRef(false);
  const armedRef = useRef(false);
  const justSwiped = useRef(false);
  const dxRef = useRef(0); // aktueller Versatz (synchron, für die Schwellen-Prüfung)

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [maxH, setMaxH] = useState<number | null>(null);

  const buzz = (ms: number) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* ignore */
      }
    }
  };

  const reset = () => {
    setDragging(false);
    setDx(0);
    dxRef.current = 0;
  };

  const triggerRemove = () => {
    setDragging(false);
    setRemoving(true);
    buzz(16);
    // Höhe einfrieren und im nächsten Frame auf 0 kollabieren, damit die
    // Nachbarzeilen sauber nachrücken.
    const el = wrapRef.current;
    if (el) {
      const h = el.offsetHeight;
      setMaxH(h);
      requestAnimationFrame(() => requestAnimationFrame(() => setMaxH(0)));
    }
    // Erst nach der Animation tatsächlich entfernen (State + Server).
    window.setTimeout(onDelete, 340);
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (removing) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    engaged.current = false;
    armedRef.current = false;
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (removing) return;
    const moveX = e.clientX - startX.current;
    const moveY = e.clientY - startY.current;
    if (!engaged.current) {
      // Nur einrasten, wenn die Bewegung klar horizontal ist – sonst bleibt
      // vertikales Scrollen / das Tippen ins Feld unangetastet.
      if (Math.abs(moveX) < 10 || Math.abs(moveX) <= Math.abs(moveY)) return;
      engaged.current = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    e.preventDefault();
    const d = Math.max(-300, Math.min(0, moveX));
    dxRef.current = d;
    setDx(d);
    const nowArmed = -d >= SWIPE_THRESHOLD;
    if (nowArmed && !armedRef.current) {
      armedRef.current = true;
      buzz(10); // fühlbares Einrasten
    } else if (!nowArmed) {
      armedRef.current = false;
    }
  };

  const onPointerUp = () => {
    if (removing || !engaged.current) return;
    engaged.current = false;
    // Folgenden Klick (z. B. auf den Haken) nach einem Wisch unterdrücken.
    justSwiped.current = true;
    window.setTimeout(() => {
      justSwiped.current = false;
    }, 80);
    if (-dxRef.current >= SWIPE_THRESHOLD) triggerRemove();
    else reset();
  };

  const onClickCapture = (e: RMouseEvent<HTMLDivElement>) => {
    if (justSwiped.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const progress = Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD));
  const isArmed = -dx >= SWIPE_THRESHOLD;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative select-none overflow-hidden",
        removing && "transition-[max-height,opacity] duration-300 ease-in",
      )}
      style={{
        touchAction: "pan-y",
        maxHeight: maxH ?? undefined,
        opacity: removing ? 0 : 1,
      }}
    >
      {/* Lösch-Hintergrund – wird beim Wischen sichtbar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-end rounded-lg pr-5 transition-colors",
          isArmed ? "bg-danger" : "bg-danger/70",
        )}
        style={{ opacity: removing ? 1 : progress }}
        aria-hidden
      >
        <Trash2
          className="size-5 text-white"
          style={{
            transform: `scale(${0.7 + progress * 0.5})`,
            opacity: 0.5 + progress * 0.5,
          }}
        />
      </div>

      {/* Vordergrund (wischbar, deckend) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        onClickCapture={onClickCapture}
        className={cn("relative rounded-lg bg-surface", dragging && "shadow-lg")}
        style={{
          transform: removing ? "translateX(-100%)" : `translateX(${dx}px)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Abgehakte Sätze: zarter grüner Tint über dem deckenden Hintergrund */}
        {completed && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-success/10" />
        )}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
