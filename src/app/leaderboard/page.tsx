import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { Leaderboard, type LeaderboardRow } from "@/components/leaderboard";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import { AchievementsView, type AchRow } from "@/components/achievements-view";
import {
  bestE1RM,
  analyzeExerciseHistory,
  computeScore,
  type ExerciseHistory,
  type TrendCounts,
} from "@/lib/coach";
import {
  statsFromWorkouts,
  achievementPoints,
  evaluateAchievements,
  TOTAL_POINTS,
} from "@/lib/achievements";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await requireUser();

  // Kennzahlen über ALLE Accounts sammeln.
  const [users, workouts] = await Promise.all([
    db.user.findMany({
      select: { id: true, username: true, displayName: true, avatar: true },
    }),
    db.workout.findMany({
      where: { finishedAt: { not: null } },
      orderBy: { startedAt: "asc" },
      select: {
        userId: true,
        totalVolume: true,
        startedAt: true,
        exercises: {
          select: {
            exerciseId: true,
            exercise: { select: { primaryMuscle: { select: { slug: true } } } },
            sets: {
              select: {
                weight: true,
                reps: true,
                rpe: true,
                isCompleted: true,
                setType: true,
              },
            },
          },
        },
      },
    }),
  ]);

  type Acc = {
    username: string;
    avatar: string | null;
    volume: number;
    workouts: number;
    sets: number;
    // Pro Übung die chronologische Verlaufs-Historie (für Trend & 1RM).
    histories: Map<string, ExerciseHistory>;
    best1rm: number;
  };

  const acc = new Map<string, Acc>();
  // Workouts je Nutzer für die Achievement-Auswertung sammeln.
  type WLite = {
    startedAt: Date;
    exercises: {
      exerciseId: string;
      muscleSlug: string;
      sets: { weight: number; reps: number; isCompleted: boolean; setType: string }[];
    }[];
  };
  const byUser = new Map<string, WLite[]>();
  for (const u of users) {
    acc.set(u.id, {
      username: u.displayName ?? u.username,
      avatar: u.avatar,
      volume: 0,
      workouts: 0,
      sets: 0,
      histories: new Map(),
      best1rm: 0,
    });
    byUser.set(u.id, []);
  }

  for (const w of workouts) {
    if (!w.userId) continue;
    const a = acc.get(w.userId);
    if (!a) continue;
    byUser.get(w.userId)?.push({
      startedAt: w.startedAt,
      exercises: w.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        muscleSlug: e.exercise.primaryMuscle.slug,
        sets: e.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          isCompleted: s.isCompleted,
          setType: s.setType,
        })),
      })),
    });
    a.volume += w.totalVolume;
    a.workouts += 1;

    for (const e of w.exercises) {
      const completed = e.sets.filter((s) => s.isCompleted);
      a.sets += completed.length;
      if (completed.length === 0) continue;

      const sessionE1RM = bestE1RM(
        completed.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
      );
      const top = completed.reduce((x, y) => (y.weight > x.weight ? y : x));
      if (sessionE1RM > a.best1rm) a.best1rm = sessionE1RM;

      const hist = a.histories.get(e.exerciseId) ?? { sessions: [] };
      hist.sessions.push({
        date: w.startedAt.toISOString(),
        bestE1RM: sessionE1RM,
        topWeight: top.weight,
        topReps: top.reps,
        workSets: completed.length,
      });
      a.histories.set(e.exerciseId, hist);
    }
  }

  const rows: LeaderboardRow[] = [...acc.entries()].map(([userId, a]) => {
    // Trend je Übung laut Coach-Verlaufsanalyse zählen.
    const trend: TrendCounts = {
      rising: 0,
      fresh: 0,
      flat: 0,
      stalled: 0,
      regressing: 0,
    };
    for (const hist of a.histories.values()) {
      const status = analyzeExerciseHistory(hist).status;
      if (status === "rising") trend.rising++;
      else if (status === "new") trend.fresh++;
      else if (status === "flat") trend.flat++;
      else if (status === "stalled") trend.stalled++;
      else if (status === "regressing") trend.regressing++;
    }

    const achPts = achievementPoints(statsFromWorkouts(byUser.get(userId) ?? []));
    const score = computeScore({
      workouts: a.workouts,
      volume: a.volume,
      best1rm: a.best1rm,
      trend,
      achievementPoints: achPts,
    });

    return {
      userId,
      username: a.username,
      avatar: a.avatar,
      score: score.total,
      workouts: a.workouts,
      volume: a.volume,
      sets: a.sets,
      best1rm: a.best1rm,
      lines: score.lines,
    };
  });

  // Rangliste nach Gesamt-Score, dann Volumen, dann Name.
  rows.sort(
    (x, y) =>
      y.score - x.score ||
      y.volume - x.volume ||
      x.username.localeCompare(y.username),
  );

  const anyActivity = rows.some((r) => r.workouts > 0);

  // Achievements des aktuellen Nutzers (serialisierbar fürs Client-Tab).
  const myStats = statsFromWorkouts(byUser.get(me.id) ?? []);
  const achRows: AchRow[] = evaluateAchievements(myStats).map((a) => ({
    id: a.def.id,
    category: a.def.category,
    title: a.def.title,
    desc: a.def.desc,
    icon: a.def.icon,
    points: a.def.points,
    goal: a.def.goal,
    unit: a.def.unit,
    value: Math.round(a.value),
    progress: a.progress,
    earned: a.earned,
  }));
  const myEarnedPoints = achRows
    .filter((r) => r.earned)
    .reduce((s, r) => s + r.points, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bestenliste"
        subtitle="Rangliste & Achievements – Konsistenz, Volumen, Coach & Belohnungen."
      />

      {!anyActivity ? (
        <EmptyState
          title="Noch keine Daten"
          description="Sobald Workouts abgeschlossen werden, füllt sich hier die Rangliste."
        />
      ) : (
        <LeaderboardTabs
          ranking={<Leaderboard rows={rows} meId={me.id} />}
          achievements={
            <AchievementsView
              rows={achRows}
              earnedPoints={myEarnedPoints}
              totalPoints={TOTAL_POINTS}
            />
          }
        />
      )}
    </div>
  );
}
