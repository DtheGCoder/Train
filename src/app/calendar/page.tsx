import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { CalendarTabs } from "@/components/calendar-tabs";
import { StatsView } from "@/components/stats-view";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { formatDuration } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();
  const workouts = await db.workout.findMany({
    where: { userId: user.id, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { exercises: true } },
      exercises: { include: { sets: true } },
    },
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

  const calendarTab = (
    <div className="space-y-6">
      {days.length === 0 ? (
        <EmptyState
          title="Noch keine Trainingstage"
          description="Abgeschlossene Workouts erscheinen hier im Kalender."
        />
      ) : (
        <WorkoutCalendar workouts={days} />
      )}

      {workouts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Verlauf</h2>
            <span className="text-xs text-muted">
              {workouts.length} abgeschlossene Workouts
            </span>
          </div>
          <ul className="space-y-3">
            {workouts.map((w) => {
              const dur =
                w.finishedAt &&
                Math.floor(
                  (w.finishedAt.getTime() - w.startedAt.getTime()) / 1000,
                );
              const totalSets = w.exercises.reduce(
                (sum, e) => sum + e.sets.filter((s) => s.isCompleted).length,
                0,
              );
              return (
                <li
                  key={w.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface pr-2 hover:bg-surface-2"
                >
                  <Link
                    href={`/history/${w.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{w.name}</p>
                      <p className="text-xs text-muted">
                        {format(w.startedAt, "EEEE, dd. MMM yyyy", {
                          locale: de,
                        })}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-muted">
                        <span>{w._count.exercises} Übungen</span>
                        <span>{totalSets} Sätze</span>
                        <span>{Math.round(w.totalVolume)} kg</span>
                        {dur ? <span>{formatDuration(dur)}</span> : null}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                  <DeleteWorkoutButton id={w.id} name={w.name} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Kalender" subtitle="Trainingstage & Statistik" />
      <CalendarTabs calendar={calendarTab} stats={<StatsView userId={user.id} />} />
    </div>
  );
}
