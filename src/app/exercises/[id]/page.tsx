import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Trophy } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { MuscleMap } from "@/components/muscle-map";
import { ExerciseTopLifters } from "@/components/exercise-top-lifters";
import { topLiftersByExercise, exerciseKey } from "@/lib/exercise-leaders";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { getExerciseDemo } from "@/lib/exercise-animation";
import { mechanicLabels, forceLabels, categoryLabels } from "@/lib/labels";
import { muscleGroups } from "@/lib/seed-data";
import { deleteExercise } from "@/lib/actions";
import { epley1RM } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function ExerciseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const exercise = await db.exercise.findFirst({
    where: { id, userId: user.id },
    include: { primaryMuscle: true, equipment: true },
  });
  if (!exercise) notFound();

  const prs = await db.personalRecord.findMany({
    where: { exerciseId: id, userId: user.id },
    orderBy: { value: "desc" },
  });
  const topLifters = (await topLiftersByExercise())[exerciseKey(exercise.nameEn)];
  const best = (type: string) =>
    prs.filter((p) => p.recordType === type).sort((a, b) => b.value - a.value)[0]
      ?.value ?? null;

  // Verlauf nach Trainingseinheit gruppiert (volle Satz-Struktur)
  const sessions = await db.workoutExercise.findMany({
    where: {
      exerciseId: id,
      workout: { finishedAt: { not: null }, userId: user.id },
    },
    include: {
      workout: true,
      sets: { where: { isCompleted: true }, orderBy: { setNumber: "asc" } },
    },
    orderBy: { workout: { startedAt: "desc" } },
    take: 12,
  });
  const history = sessions
    .filter((s) => s.sets.length > 0)
    .map((s) => {
      const volume = s.sets.reduce((sum, x) => sum + x.weight * x.reps, 0);
      const best1rm = Math.max(...s.sets.map((x) => epley1RM(x.weight, x.reps)));
      return {
        id: s.id,
        date: s.workout.startedAt,
        sets: s.sets.map((x) => ({ weight: x.weight, reps: x.reps })),
        volume,
        best1rm,
      };
    });

  const secondary = exercise.secondaryMuscles
    ? exercise.secondaryMuscles.split(",").filter(Boolean)
    : [];
  const muscleName = (slug: string) =>
    muscleGroups.find((m) => m.slug === slug)?.nameDe ?? slug;

  // Animierte Bewegungs-Demo (gemeinfreier Datensatz), sonst Muskelkarte.
  const demo = getExerciseDemo(exercise.nameEn);

  return (
    <div className="space-y-5">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Übungen
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{exercise.nameDe}</h1>
        <p className="text-sm text-muted">{exercise.nameEn}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className="bg-primary/15 text-primary">
          {exercise.primaryMuscle.nameDe}
        </Badge>
        {exercise.equipment && <Badge>{exercise.equipment.nameDe}</Badge>}
        <Badge>{mechanicLabels[exercise.mechanic] ?? exercise.mechanic}</Badge>
        <Badge>{forceLabels[exercise.forceType] ?? exercise.forceType}</Badge>
        <Badge>{categoryLabels[exercise.category] ?? exercise.category}</Badge>
        {exercise.isCustom && (
          <Badge className="bg-success/15 text-success">Eigene</Badge>
        )}
      </div>

      {/* Animierte Bewegungs-Demo (gemeinfrei), falls verfügbar */}
      {demo && <ExerciseAnimation frames={demo.frames} />}

      {/* Muskelkarte: hebt genau die trainierten Muskeln hervor (aus den
          Übungsdaten abgeleitet – immer korrekt). */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold">Trainierte Muskeln</h2>
        <div className="mx-auto max-w-md">
          <MuscleMap
            primary={exercise.primaryMuscle.slug}
            secondary={secondary}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" />
            Primär: {exercise.primaryMuscle.nameDe}
          </span>
          {secondary.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 42%, transparent)",
                }}
              />
              Sekundär: {secondary.map(muscleName).join(", ")}
            </span>
          )}
        </div>
      </Card>

      {topLifters && topLifters.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="size-4 text-amber-400" /> Top 3 · meiste kg
          </h2>
          <ExerciseTopLifters lifters={topLifters} />
        </Card>
      )}

      {exercise.instructions && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Ausführung</h2>
          <p className="text-sm text-muted">{exercise.instructions}</p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xs text-muted">Bestes 1RM</p>
          <p className="text-xl font-bold">{best("1rm") ?? "–"}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-muted">Max. Gewicht</p>
          <p className="text-xl font-bold">{best("maxWeight") ?? "–"}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-muted">Max. Wdh.</p>
          <p className="text-xl font-bold">{best("maxReps") ?? "–"}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Verlauf je Training</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Daten erfasst.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {format(h.date, "EEE, dd.MM.yyyy", { locale: de })}
                  </span>
                  <span className="text-xs text-muted">
                    {h.sets.length} Sätze · {Math.round(h.volume)} kg · 1RM ~
                    {Math.round(h.best1rm)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {h.sets.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs tabular-nums"
                    >
                      {s.weight}×{s.reps}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {exercise.isCustom && (
        <form action={deleteExercise.bind(null, exercise.id)}>
          <Button variant="danger" type="submit" className="w-full">
            <Trash2 className="size-4" /> Übung löschen
          </Button>
        </form>
      )}
    </div>
  );
}
