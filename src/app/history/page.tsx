import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatDuration } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  const workouts = await db.workout.findMany({
    where: { userId: user.id, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { exercises: true } },
      exercises: { include: { sets: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verlauf"
        subtitle={`${workouts.length} abgeschlossene Workouts`}
      />

      {workouts.length === 0 ? (
        <EmptyState
          title="Noch kein Verlauf"
          description="Abgeschlossene Workouts erscheinen hier."
        />
      ) : (
        <ul className="space-y-3">
          {workouts.map((w) => {
            const dur =
              w.finishedAt &&
              Math.floor((w.finishedAt.getTime() - w.startedAt.getTime()) / 1000);
            const totalSets = w.exercises.reduce(
              (sum, e) => sum + e.sets.filter((s) => s.isCompleted).length,
              0,
            );
            return (
              <li key={w.id}>
                <Link
                  href={`/history/${w.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                >
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-muted">
                      {format(w.startedAt, "EEEE, dd. MMM yyyy", { locale: de })}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs text-muted">
                      <span>{w._count.exercises} Übungen</span>
                      <span>{totalSets} Sätze</span>
                      <span>{Math.round(w.totalVolume)} kg</span>
                      {dur ? <span>{formatDuration(dur)}</span> : null}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
