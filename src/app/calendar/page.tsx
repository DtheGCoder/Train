import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import { WorkoutCalendar } from "@/components/workout-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const workouts = await db.workout.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: { exercises: { include: { sets: true } } },
  });

  const days = workouts.map((w) => ({
    id: w.id,
    name: w.name,
    date: w.startedAt.toISOString(),
    volume: w.totalVolume,
    sets: w.exercises.reduce(
      (sum, e) => sum + e.sets.filter((s) => s.isCompleted).length,
      0,
    ),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Kalender" subtitle="Deine Trainingstage im Überblick" />
      {days.length === 0 ? (
        <EmptyState
          title="Noch keine Trainingstage"
          description="Abgeschlossene Workouts erscheinen hier im Kalender."
        />
      ) : (
        <WorkoutCalendar workouts={days} />
      )}
    </div>
  );
}
