import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  userId: string;
  username: string;
  volume: number; // Gesamt-Trainingsvolumen (kg)
  workouts: number; // abgeschlossene Workouts
  sets: number; // abgehakte Sätze gesamt
  best1rm: number; // stärkstes geschätztes 1RM (kg)
};

export default async function LeaderboardPage() {
  const me = await requireUser();

  // Kennzahlen über ALLE Accounts sammeln.
  const [users, workouts, prs] = await Promise.all([
    db.user.findMany({ select: { id: true, username: true } }),
    db.workout.findMany({
      where: { finishedAt: { not: null } },
      select: {
        userId: true,
        totalVolume: true,
        exercises: { select: { sets: { select: { isCompleted: true } } } },
      },
    }),
    db.personalRecord.findMany({
      where: { recordType: "1rm" },
      select: { userId: true, value: true },
    }),
  ]);

  const stats = new Map<string, Row>();
  for (const u of users) {
    stats.set(u.id, {
      userId: u.id,
      username: u.username,
      volume: 0,
      workouts: 0,
      sets: 0,
      best1rm: 0,
    });
  }
  for (const w of workouts) {
    if (!w.userId) continue;
    const r = stats.get(w.userId);
    if (!r) continue;
    r.volume += w.totalVolume;
    r.workouts += 1;
    for (const e of w.exercises)
      for (const s of e.sets) if (s.isCompleted) r.sets += 1;
  }
  for (const p of prs) {
    if (!p.userId) continue;
    const r = stats.get(p.userId);
    if (r && p.value > r.best1rm) r.best1rm = p.value;
  }

  // Rangliste: primär nach Volumen, dann Workouts, Sätze, Name.
  const rows = [...stats.values()].sort(
    (a, b) =>
      b.volume - a.volume ||
      b.workouts - a.workouts ||
      b.sets - a.sets ||
      a.username.localeCompare(b.username),
  );

  const anyActivity = rows.some((r) => r.volume > 0 || r.workouts > 0);
  const podium = rows
    .slice(0, 3)
    .filter((r) => r.volume > 0 || r.workouts > 0);

  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  // Podium klassisch anordnen: 2. – 1. – 3.
  const podiumOrder = [1, 0, 2]
    .filter((i) => podium[i])
    .map((i) => ({ row: podium[i], place: i + 1 }));

  const place = {
    1: {
      ring: "ring-amber-400",
      badge: "bg-amber-400 text-black",
      pedestal: "h-20 bg-amber-400/20",
    },
    2: {
      ring: "ring-slate-300",
      badge: "bg-slate-300 text-black",
      pedestal: "h-14 bg-slate-300/15",
    },
    3: {
      ring: "ring-amber-700",
      badge: "bg-amber-700 text-white",
      pedestal: "h-10 bg-amber-700/20",
    },
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bestenliste"
        subtitle="Wer trainiert am meisten? Rangliste aller Accounts nach Gesamtvolumen."
      />

      {!anyActivity ? (
        <EmptyState
          title="Noch keine Daten"
          description="Sobald Workouts abgeschlossen werden, füllt sich hier die Rangliste."
        />
      ) : (
        <>
          {/* Podium – Top 3 */}
          <div className="flex items-end justify-center gap-3 sm:gap-5">
            {podiumOrder.map(({ row, place: pl }) => {
              const p = place[pl as 1 | 2 | 3];
              const isMe = row.userId === me.id;
              return (
                <div
                  key={row.userId}
                  className="flex min-w-0 flex-1 flex-col items-center"
                >
                  {pl === 1 && (
                    <Crown className="mb-1 size-5 text-amber-400" />
                  )}
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full bg-surface-2 text-sm font-bold ring-2",
                      p.ring,
                    )}
                  >
                    {initials(row.username)}
                  </div>
                  <p className="mt-2 w-full truncate text-center text-sm font-semibold">
                    {row.username}
                    {isMe && <span className="text-muted"> (du)</span>}
                  </p>
                  <p className="text-xs font-medium tabular-nums text-muted">
                    {fmt(row.volume)} kg
                  </p>
                  <div
                    className={cn(
                      "mt-2 flex w-full items-start justify-center rounded-t-lg pt-2",
                      p.pedestal,
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-sm font-bold",
                        p.badge,
                      )}
                    >
                      {pl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vollständige Rangliste */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <h2 className="font-semibold">Rangliste ({rows.length})</h2>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {rows.map((r, i) => {
                const isMe = r.userId === me.id;
                return (
                  <div
                    key={r.userId}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      isMe && "bg-primary/5",
                    )}
                  >
                    <span className="w-5 text-center text-sm font-bold tabular-nums text-muted">
                      {i + 1}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                      {initials(r.username)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {r.username}
                        {isMe && (
                          <span className="ml-1 text-xs text-muted">(du)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {r.workouts} Workouts · {fmt(r.sets)} Sätze
                        {r.best1rm > 0 && <> · Top 1RM {fmt(r.best1rm)} kg</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{fmt(r.volume)} kg</p>
                      <p className="text-[11px] text-muted">Volumen</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              Rang nach Gesamtvolumen (kg) über alle abgeschlossenen Workouts.
              Top 1RM ist das stärkste geschätzte Einmal-Maximum.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
