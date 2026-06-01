import { db } from "@/lib/db";
import Link from "next/link";
import { Play, Dumbbell, ChevronRight, Flame, UserCog } from "lucide-react";
import { Card, Button, LinkButton, PageHeader } from "@/components/ui";
import { startWorkout } from "@/lib/actions";
import { formatDuration } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function Home() {
  const active = await db.workout.findFirst({
    where: { finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { exercises: true } } },
  });

  const recent = await db.workout.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 5,
    include: { _count: { select: { exercises: true } } },
  });

  const routines = await db.routine.findMany({
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: { _count: { select: { exercises: true } } },
  });

  const totalWorkouts = await db.workout.count({
    where: { finishedAt: { not: null } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Train"
        subtitle="Bereit fürs Training?"
        action={
          <Link
            href="/profile"
            aria-label="Coach & Profil"
            className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground active:bg-surface-2 md:hidden"
          >
            <UserCog className="size-5" />
          </Link>
        }
      />

      {active ? (
        <Card className="border-primary/40 bg-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Aktives Workout</p>
              <p className="text-lg font-bold">{active.name}</p>
              <p className="text-xs text-muted">
                {active._count.exercises} Übungen · gestartet{" "}
                {format(active.startedAt, "HH:mm", { locale: de })}
              </p>
            </div>
            <LinkButton href={`/workout/${active.id}`}>Fortsetzen</LinkButton>
          </div>
        </Card>
      ) : (
        <form action={startWorkout.bind(null, undefined)}>
          <Button type="submit" className="w-full py-4 text-base">
            <Play className="size-5" /> Freies Workout starten
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <Flame className="mx-auto mb-1 size-5 text-primary" />
          <p className="text-2xl font-bold">{totalWorkouts}</p>
          <p className="text-xs text-muted">Workouts gesamt</p>
        </Card>
        <Card className="text-center">
          <Dumbbell className="mx-auto mb-1 size-5 text-primary" />
          <p className="text-2xl font-bold">{routines.length}</p>
          <p className="text-xs text-muted">Trainingspläne</p>
        </Card>
      </div>

      {routines.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Schnellstart aus Plan</h2>
            <Link href="/routines" className="text-sm text-primary">
              Alle
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {routines.map((r) => (
              <form key={r.id} action={startWorkout.bind(null, r.id)}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-2"
                >
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r._count.exercises} Übungen
                  </p>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Letzte Workouts</h2>
          <Link href="/history" className="text-sm text-primary">
            Verlauf
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Workouts abgeschlossen.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {recent.map((w) => {
              const dur =
                w.finishedAt &&
                Math.floor(
                  (w.finishedAt.getTime() - w.startedAt.getTime()) / 1000,
                );
              return (
                <li key={w.id}>
                  <Link
                    href={`/history/${w.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-2"
                  >
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-muted">
                        {format(w.startedAt, "EEE, dd.MM.", { locale: de })} ·{" "}
                        {w._count.exercises} Übungen ·{" "}
                        {Math.round(w.totalVolume)} kg
                        {dur ? ` · ${formatDuration(dur)}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
