import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoutineEditor } from "@/components/routine-editor";

export const dynamic = "force-dynamic";

export default async function RoutineDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routine = await db.routine.findUnique({
    where: { id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: { include: { primaryMuscle: true } } },
      },
    },
  });
  if (!routine) notFound();

  const [allExercises, muscles, equipment] = await Promise.all([
    db.exercise.findMany({
      include: { primaryMuscle: true, equipment: true },
      orderBy: { nameDe: "asc" },
    }),
    db.muscleGroup.findMany({ orderBy: { nameDe: "asc" } }),
    db.equipment.findMany({ orderBy: { nameDe: "asc" } }),
  ]);

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

  return (
    <div className="space-y-5">
      <Link
        href="/routines"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Pläne
      </Link>

      <RoutineEditor
        routineId={routine.id}
        name={routine.name}
        exercises={routine.exercises.map((re) => ({
          id: re.id,
          name: re.exercise.nameDe,
          muscleName: re.exercise.primaryMuscle.nameDe,
          targetSets: re.targetSets,
          targetReps: re.targetReps,
          targetRestSec: re.targetRestSec,
        }))}
        pickerItems={pickerItems}
        muscles={muscles.map((m) => ({ slug: m.slug, name: m.nameDe }))}
        equipment={equipment.map((e) => ({ slug: e.slug, name: e.nameDe }))}
      />
    </div>
  );
}
