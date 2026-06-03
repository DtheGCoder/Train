import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Timer, Dumbbell, TrendingUp, BookmarkPlus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { setTypeShort } from "@/lib/labels";
import { formatDuration, epley1RM } from "@/lib/utils";
import { saveWorkoutAsRoutine } from "@/lib/actions";
import { MuscleQualityMap, muscleQuality } from "@/components/muscle-map";
import { MuscleGroupRadar, type RadarPoint } from "@/components/stats-muscle-radar";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

// Spezifische Muskeln → 6 Hauptgruppen (für das Radar dieses Workouts).
const MUSCLE_GROUP: Record<string, string> = {
  chest: "Brust",
  back: "Rückenmuskulatur",
  lats: "Rückenmuskulatur",
  traps: "Rückenmuskulatur",
  shoulders: "Schultern",
  biceps: "Arme",
  triceps: "Arme",
  forearms: "Arme",
  quads: "Beine",
  hamstrings: "Beine",
  glutes: "Beine",
  calves: "Beine",
  abs: "Rumpf",
  obliques: "Rumpf",
  lowerback: "Rumpf",
};

export default async function WorkoutDetail({
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
          exercise: { include: { primaryMuscle: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
  if (!workout) notFound();

  const dur =
    workout.finishedAt &&
    Math.floor((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 1000);
  const totalSets = workout.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.isCompleted).length,
    0,
  );

  // Trainierte Muskeln (Qualität rot/gelb/grün) + Radar dieses Workouts.
  const day = format(workout.startedAt, "yyyy-MM-dd");
  const setsByMuscle: Record<string, number> = {};
  const radarMap = new Map<
    string,
    { reps: number; sets: number; volume: number }
  >();
  for (const we of workout.exercises) {
    const working = we.sets.filter(
      (s) => s.isCompleted && s.setType !== "warmup",
    );
    if (working.length === 0) continue;
    const slug = we.exercise.primaryMuscle.slug;
    setsByMuscle[slug] = (setsByMuscle[slug] ?? 0) + working.length;
    const group = MUSCLE_GROUP[slug];
    if (group) {
      const cur = radarMap.get(group) ?? { reps: 0, sets: 0, volume: 0 };
      for (const s of working) {
        cur.reps += s.reps;
        cur.sets += 1;
        cur.volume += s.weight * s.reps;
      }
      radarMap.set(group, cur);
    }
  }
  const status = muscleQuality(setsByMuscle);
  const radarData: RadarPoint[] = [...radarMap.entries()].map(([group, v]) => ({
    date: day,
    group,
    ...v,
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Verlauf
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{workout.name}</h1>
          <p className="text-sm text-muted">
            {format(workout.startedAt, "EEEE, dd. MMMM yyyy 'um' HH:mm", {
              locale: de,
            })}
          </p>
        </div>
        <form action={saveWorkoutAsRoutine.bind(null, workout.id)}>
          <Button variant="secondary" type="submit" className="shrink-0">
            <BookmarkPlus className="size-4" /> Als Vorlage
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <Timer className="mx-auto mb-1 size-4 text-primary" />
          <p className="text-lg font-bold">{dur ? formatDuration(dur) : "–"}</p>
          <p className="text-xs text-muted">Dauer</p>
        </Card>
        <Card className="text-center">
          <Dumbbell className="mx-auto mb-1 size-4 text-primary" />
          <p className="text-lg font-bold">{Math.round(workout.totalVolume)}</p>
          <p className="text-xs text-muted">kg Volumen</p>
        </Card>
        <Card className="text-center">
          <TrendingUp className="mx-auto mb-1 size-4 text-primary" />
          <p className="text-lg font-bold">{totalSets}</p>
          <p className="text-xs text-muted">Sätze</p>
        </Card>
      </div>

      {/* Trainierte Muskeln dieses Workouts (rot/gelb/grün) */}
      {Object.keys(status).length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Trainierte Muskeln</h2>
          <MuscleQualityMap status={status} className="mx-auto max-w-md" />
        </Card>
      )}

      {/* Muskelgruppen-Verteilung dieses Workouts */}
      {radarData.length > 0 && <MuscleGroupRadar data={radarData} hideRange />}

      <div className="space-y-3">
        {workout.exercises.map((we) => (
          <div
            key={we.id}
            className="rounded-xl border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold">{we.exercise.nameDe}</p>
              <p className="text-xs text-muted">
                {we.exercise.primaryMuscle.nameDe}
              </p>
            </div>
            <ul className="divide-y divide-border text-sm">
              {we.sets.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between px-4 py-2 ${
                    s.isCompleted ? "" : "opacity-40"
                  }`}
                >
                  <span className="text-muted">
                    Satz {s.setNumber}
                    {setTypeShort[s.setType] && (
                      <span className="ml-1 text-xs">
                        ({setTypeShort[s.setType]})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    {s.weight} kg × {s.reps}
                    <span className="ml-2 text-xs text-muted">
                      1RM ~{epley1RM(s.weight, s.reps)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
