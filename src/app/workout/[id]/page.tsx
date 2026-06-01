import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { WorkoutSession } from "@/components/workout-session";
import { loadCoachProfile } from "@/lib/coach-data";

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

  // Vorige Leistung je Übung (letztes abgeschlossenes Workout)
  const previousMap: Record<string, { weight: number; reps: number }[]> = {};
  for (const we of workout.exercises) {
    const prevWe = await db.workoutExercise.findFirst({
      where: {
        exerciseId: we.exerciseId,
        workout: { finishedAt: { not: null }, userId: user.id },
        workoutId: { not: workout.id },
      },
      orderBy: { workout: { startedAt: "desc" } },
      include: { sets: { where: { isCompleted: true }, orderBy: { setNumber: "asc" } } },
    });
    if (prevWe && prevWe.sets.length > 0) {
      previousMap[we.exerciseId] = prevWe.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
      }));
    }
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
      pickerItems={pickerItems}
      muscles={muscles.map((m) => ({ slug: m.slug, name: m.nameDe }))}
      equipment={equipment.map((e) => ({ slug: e.slug, name: e.nameDe }))}
      coach={{ profile, baseline }}
    />
  );
}
