import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { WorkoutSession } from "@/components/workout-session";
import { loadCoachProfile } from "@/lib/coach-data";
import { e1rm, type ExerciseHistory } from "@/lib/coach";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const workout = await db.workout.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: {
          exercise: { include: { primaryMuscle: true, equipment: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
  if (!workout) notFound();
  if (workout.finishedAt) redirect(`/history/${workout.id}`);

  // Vorige Leistung + Verlauf je Übung (letzte abgeschlossene Einheiten).
  // Der Coach greift auf diesen Verlauf zu, um Trend/Plateau zu erkennen und
  // nicht stur dasselbe zu empfehlen.
  const previousMap: Record<string, { weight: number; reps: number }[]> = {};
  const historyMap: Record<string, ExerciseHistory> = {};
  // Eindeutige Übungs-IDs (eine Übung kann mehrfach im Workout stehen).
  const uniqueExerciseIds = [...new Set(workout.exercises.map((we) => we.exerciseId))];
  for (const exerciseId of uniqueExerciseIds) {
    const prevWes = await db.workoutExercise.findMany({
      where: {
        exerciseId,
        workout: { finishedAt: { not: null }, userId: user.id },
        workoutId: { not: workout.id },
      },
      orderBy: { workout: { startedAt: "desc" } },
      take: 8,
      include: {
        sets: { where: { isCompleted: true }, orderBy: { setNumber: "asc" } },
        workout: { select: { startedAt: true } },
      },
    });
    // Letzte Einheit als „previous"-Hinweis (Sätze in Reihenfolge).
    const lastWithSets = prevWes.find((w) => w.sets.length > 0);
    if (lastWithSets) {
      previousMap[exerciseId] = lastWithSets.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
      }));
    }
    // Verlauf chronologisch AUFSTEIGEND, je Einheit Kennzahlen verdichten.
    const sessions = prevWes
      .filter((w) => w.sets.length > 0)
      .map((w) => {
        const working = w.sets.filter(
          (s) => s.setType !== "warmup" && s.weight > 0 && s.reps > 0,
        );
        let bestE1RM = 0;
        let topWeight = 0;
        let topReps = 0;
        for (const s of working) {
          const v = e1rm(s.weight, s.reps);
          if (v > bestE1RM) bestE1RM = v;
          if (s.weight > topWeight) {
            topWeight = s.weight;
            topReps = s.reps;
          }
        }
        return {
          date: w.workout.startedAt.toISOString(),
          bestE1RM: Math.round(bestE1RM * 10) / 10,
          topWeight,
          topReps,
          workSets: working.length,
        };
      })
      .filter((s) => s.bestE1RM > 0)
      .reverse(); // ältester zuerst
    if (sessions.length > 0) historyMap[exerciseId] = { sessions };
  }

  const [allExercises, muscles, equipment] = await Promise.all([
    db.exercise.findMany({
      where: { userId: user.id },
      include: { primaryMuscle: true, equipment: true },
      orderBy: { nameDe: "asc" },
    }),
    db.muscleGroup.findMany({ orderBy: { nameDe: "asc" } }),
    db.equipment.findMany({ orderBy: { nameDe: "asc" } }),
  ]);

  // Coach: Profil + Basis-1RM je Übung (bestes geschätztes 1RM aus PRs).
  const exerciseIds = workout.exercises.map((we) => we.exerciseId);
  const [profile, oneRmPrs] = await Promise.all([
    loadCoachProfile(),
    db.personalRecord.findMany({
      where: { userId: user.id, exerciseId: { in: exerciseIds }, recordType: "1rm" },
      orderBy: { value: "desc" },
    }),
  ]);
  const baseline: Record<string, number> = {};
  for (const pr of oneRmPrs) {
    if (!(pr.exerciseId in baseline)) baseline[pr.exerciseId] = pr.value;
  }

  const pickerItems = allExercises.map((e) => ({
    id: e.id,
    nameDe: e.nameDe,
    nameEn: e.nameEn,
    muscleSlug: e.primaryMuscle.slug,
    muscleName: e.primaryMuscle.nameDe,
    equipmentSlug: e.equipment?.slug ?? null,
    equipmentName: e.equipment?.nameDe ?? null,
    mechanic: e.mechanic,
    category: e.category,
    isCustom: e.isCustom,
  }));

  const initial = {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt.toISOString(),
    exercises: workout.exercises.map((we) => ({
      id: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.nameDe,
      muscleName: we.exercise.primaryMuscle.nameDe,
      sets: we.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        setType: s.setType,
        isCompleted: s.isCompleted,
      })),
    })),
  };

  return (
    <WorkoutSession
      initial={initial}
      previous={previousMap}
      history={historyMap}
      pickerItems={pickerItems}
      muscles={muscles.map((m) => ({ slug: m.slug, name: m.nameDe }))}
      equipment={equipment.map((e) => ({ slug: e.slug, name: e.nameDe }))}
      coach={{ profile, baseline }}
    />
  );
}
