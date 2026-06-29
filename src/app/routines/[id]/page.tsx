import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Info, Stethoscope } from "lucide-react";
import { RoutineEditor } from "@/components/routine-editor";
import { RoutineShareToggle } from "@/components/routine-share-toggle";
import { Card } from "@/components/ui";
import { loadCoachProfile } from "@/lib/coach-data";
import { reviewRoutine } from "@/lib/coach-knowledge";
import { parseRoutineSets } from "@/lib/routine-sets";
import { topLiftersByExercise, exerciseKey } from "@/lib/exercise-leaders";

export const dynamic = "force-dynamic";

export default async function RoutineDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const routine = await db.routine.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: {
          exercise: { include: { primaryMuscle: true, equipment: true } },
        },
      },
    },
  });
  if (!routine) notFound();

  const [allExercises, muscles, equipment, profile, topLifters] =
    await Promise.all([
      db.exercise.findMany({
        where: { userId: user.id },
        include: { primaryMuscle: true, equipment: true },
        orderBy: { nameDe: "asc" },
      }),
      db.muscleGroup.findMany({ orderBy: { nameDe: "asc" } }),
      db.equipment.findMany({ orderBy: { nameDe: "asc" } }),
      loadCoachProfile(),
      topLiftersByExercise(),
    ]);

  // Coach prüft die Vorlage gegen die Wissensbasis (Struktur/Volumen/Wdh/Balance).
  const review = reviewRoutine(
    routine.exercises.map((re) => ({
      name: re.exercise.nameDe,
      muscleSlug: re.exercise.primaryMuscle.slug,
      mechanic: re.exercise.mechanic,
      targetSets: re.targetSets,
      targetReps: re.targetReps,
    })),
    profile,
  );
  const reviewSev = {
    good: { Icon: CheckCircle2, cls: "text-success", ring: "border-success/30" },
    info: { Icon: Info, cls: "text-muted", ring: "border-border" },
    warning: { Icon: AlertTriangle, cls: "text-amber-400", ring: "border-amber-400/30" },
  } as const;

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
    instructions: e.instructions,
    topLifters: topLifters[exerciseKey(e.nameEn)],
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/routines"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Pläne
      </Link>

      {/* Coach-Check der Vorlage */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-5 text-primary" />
          <h2 className="font-semibold">Coach-Check</h2>
          {review.totalSets > 0 && (
            <span className="ml-auto text-xs text-muted">
              {review.totalSets} Arbeitssätze
            </span>
          )}
        </div>
        <div className="space-y-2">
          {review.findings.map((f, i) => {
            const s = reviewSev[f.severity];
            return (
              <div
                key={i}
                className={`flex gap-3 rounded-lg border ${s.ring} bg-surface-2 px-3 py-2.5`}
              >
                <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.cls}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${s.cls}`}>{f.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted">
                    {f.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted">
          Bewertung anhand sportwissenschaftlicher Richtwerte (siehe
          Trainingswissen). Orientierung, keine starre Regel.
        </p>
      </Card>

      <RoutineEditor
        routineId={routine.id}
        name={routine.name}
        exercises={routine.exercises.map((re) => ({
          id: re.id,
          exerciseId: re.exerciseId,
          name: re.exercise.nameDe,
          nameEn: re.exercise.nameEn,
          muscleName: re.exercise.primaryMuscle.nameDe,
          equipmentName: re.exercise.equipment?.nameDe ?? null,
          mechanic: re.exercise.mechanic,
          category: re.exercise.category,
          instructions: re.exercise.instructions,
          sets: parseRoutineSets(re),
          targetRestSec: re.targetRestSec,
        }))}
        pickerItems={pickerItems}
        muscles={muscles.map((m) => ({ slug: m.slug, name: m.nameDe }))}
        equipment={equipment.map((e) => ({ slug: e.slug, name: e.nameDe }))}
      />

      {/* Eigene Vorlagen für die Community freigeben (keine System-Vorlagen). */}
      {!routine.isPreset && (
        <RoutineShareToggle
          routineId={routine.id}
          initialPublic={routine.isPublic}
        />
      )}
    </div>
  );
}
