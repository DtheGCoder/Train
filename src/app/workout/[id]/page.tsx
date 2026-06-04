import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { WorkoutSession } from "@/components/workout-session";
import { loadCoachProfile } from "@/lib/coach-data";
import { e1rm, type ExerciseHistory } from "@/lib/coach";
import {
  aggregateWeekly,
  weeklyWindowStart,
  type SetEntry,
} from "@/lib/coach-volume";

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
        durationSec: s.durationSec,
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

  // Wochenvolumen je Muskelgruppe (letzte 7 Tage, OHNE dieses laufende Workout)
  // – damit der Coach live mitdenkt, wenn ein Muskel diese Woche schon viel/zu
  // wenig bekommen hat.
  const weekAgo = new Date(weeklyWindowStart());
  const recentForVol = await db.workout.findMany({
    where: {
      userId: user.id,
      finishedAt: { not: null },
      startedAt: { gte: weekAgo },
      id: { not: workout.id },
    },
    select: {
      startedAt: true,
      exercises: {
        select: {
          exercise: {
            select: {
              primaryMuscle: { select: { slug: true } },
              secondaryMuscles: true,
            },
          },
          sets: {
            select: {
              isCompleted: true,
              setType: true,
              weight: true,
              reps: true,
              durationSec: true,
            },
          },
        },
      },
    },
  });
  const volEntries: SetEntry[] = [];
  for (const w of recentForVol) {
    const day = w.startedAt.toISOString().slice(0, 10);
    for (const we of w.exercises) {
      const hard = we.sets.filter(
        (s) =>
          s.isCompleted &&
          s.setType !== "warmup" &&
          (s.weight > 0 || s.reps > 0 || s.durationSec > 0),
      ).length;
      if (hard === 0) continue;
      const primary = we.exercise.primaryMuscle.slug;
      const secondary = we.exercise.secondaryMuscles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = 0; i < hard; i++) volEntries.push({ primary, secondary, day });
    }
  }
  const weeklyBaseline: Record<string, number> = {};
  for (const g of aggregateWeekly(volEntries, profile)) {
    weeklyBaseline[g.key] = g.sets;
  }

  const pickerItems = allExercises.map((e) => ({
    id: e.id,
    nameDe: e.nameDe,
    nameEn: e.nameEn,
    muscleSlug: e.primaryMuscle.slug,
    muscleName: e.primaryMuscle.nameDe,
    secondarySlugs: e.secondaryMuscles
      ? e.secondaryMuscles.split(",").filter(Boolean)
      : [],
    equipmentSlug: e.equipment?.slug ?? null,
    equipmentName: e.equipment?.nameDe ?? null,
    mechanic: e.mechanic,
    category: e.category,
    trackingType: e.trackingType,
    isCustom: e.isCustom,
    instructions: e.instructions,
  }));

  const initial = {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt.toISOString(),
    routineId: workout.routineId ?? null,
    exercises: workout.exercises.map((we) => ({
      id: we.id,
      exerciseId: we.exerciseId,
      name: we.exercise.nameDe,
      nameEn: we.exercise.nameEn,
      muscleName: we.exercise.primaryMuscle.nameDe,
      muscleSlug: we.exercise.primaryMuscle.slug,
      secondarySlugs: we.exercise.secondaryMuscles
        ? we.exercise.secondaryMuscles.split(",").filter(Boolean)
        : [],
      equipmentSlug: we.exercise.equipment?.slug ?? null,
      equipmentName: we.exercise.equipment?.nameDe ?? null,
      mechanic: we.exercise.mechanic,
      category: we.exercise.category,
      trackingType: we.exercise.trackingType,
      instructions: we.exercise.instructions,
      sets: we.sets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        durationSec: s.durationSec,
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
      weeklyBaseline={weeklyBaseline}
    />
  );
}
