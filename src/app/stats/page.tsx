import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StatsCharts } from "@/components/stats-charts";
import { MuscleTrends } from "@/components/stats-muscle-trends";
import { ResetDataButton } from "@/components/reset-data-button";
import { format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await requireUser();
  const workouts = await db.workout.findMany({
    where: { userId: user.id, finishedAt: { not: null } },
    orderBy: { startedAt: "asc" },
    include: {
      exercises: {
        include: {
          exercise: { include: { primaryMuscle: true } },
          sets: true,
        },
      },
    },
  });

  if (workouts.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Statistik" />
        <EmptyState
          title="Noch keine Daten"
          description="Schließe Workouts ab, um Auswertungen zu sehen."
        />
      </div>
    );
  }

  // Volumen pro Woche
  const weekMap = new Map<string, number>();
  // Volumen pro Muskelgruppe
  const muscleMap = new Map<string, number>();

  for (const w of workouts) {
    const weekStart = startOfWeek(w.startedAt, { weekStartsOn: 1 });
    const key = format(weekStart, "dd.MM.", { locale: de });
    weekMap.set(key, (weekMap.get(key) ?? 0) + w.totalVolume);

    for (const we of w.exercises) {
      const muscle = we.exercise.primaryMuscle.nameDe;
      const vol = we.sets
        .filter((s) => s.isCompleted)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);
      muscleMap.set(muscle, (muscleMap.get(muscle) ?? 0) + vol);
    }
  }

  const volumeByWeek = Array.from(weekMap.entries())
    .slice(-12)
    .map(([week, volume]) => ({ week, volume: Math.round(volume) }));

  const volumeByMuscle = Array.from(muscleMap.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }));

  const totalVolume = workouts.reduce((s, w) => s + w.totalVolume, 0);

  // Zeitreihe je Muskelgruppe (pro Tag aggregiert, Client bucketet weiter)
  const dayMuscle = new Map<string, { volume: number; sets: number }>();
  for (const w of workouts) {
    const day = format(w.startedAt, "yyyy-MM-dd");
    for (const we of w.exercises) {
      const muscle = we.exercise.primaryMuscle.nameDe;
      for (const s of we.sets) {
        if (!s.isCompleted) continue;
        const key = `${day}__${muscle}`;
        const cur = dayMuscle.get(key) ?? { volume: 0, sets: 0 };
        cur.volume += s.weight * s.reps;
        cur.sets += 1;
        dayMuscle.set(key, cur);
      }
    }
  }
  const trendData = [...dayMuscle.entries()].map(([k, v]) => {
    const [date, muscle] = k.split("__");
    return { date, muscle, volume: v.volume, sets: v.sets };
  });

  const prs = await db.personalRecord.findMany({
    where: { userId: user.id, recordType: "1rm" },
    orderBy: { value: "desc" },
    include: { exercise: true },
    take: 10,
  });
  // Pro Übung nur bester Wert
  const bestPrMap = new Map<string, (typeof prs)[number]>();
  for (const pr of prs) {
    const cur = bestPrMap.get(pr.exerciseId);
    if (!cur || pr.value > cur.value) bestPrMap.set(pr.exerciseId, pr);
  }
  const topPrs = Array.from(bestPrMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader title="Statistik" subtitle="Dein Fortschritt im Überblick" />

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold">{workouts.length}</p>
          <p className="text-xs text-muted">Workouts</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">
            {Math.round(totalVolume).toLocaleString("de-DE")}
          </p>
          <p className="text-xs text-muted">kg Gesamtvolumen</p>
        </Card>
      </div>

      <StatsCharts volumeByWeek={volumeByWeek} volumeByMuscle={volumeByMuscle} />

      <div>
        <h2 className="mb-2 font-semibold">Verlauf je Muskelgruppe</h2>
        <p className="mb-3 text-sm text-muted">
          Was du pro Tag, Woche oder Monat trainiert hast.
        </p>
        <MuscleTrends data={trendData} />
      </div>

      {topPrs.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Persönliche Rekorde (geschätztes 1RM)</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {topPrs.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span>{pr.exercise.nameDe}</span>
                <span className="font-bold">{Math.round(pr.value)} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Daten</h2>
        <p className="mb-3 text-sm text-muted">
          Setzt alle Trainingsdaten auf null zurück. Übungen, Pläne und dein
          Coach-Profil bleiben erhalten.
        </p>
        <ResetDataButton />
      </div>
    </div>
  );
}
