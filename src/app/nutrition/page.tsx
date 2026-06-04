import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { loadCoachProfile } from "@/lib/coach-data";
import { age } from "@/lib/coach";
import {
  nutritionTargets,
  supplementItems,
  foodCoach,
  nutritionTips,
  todayKey,
  yesterdayKey,
  isoWeekdayToday,
} from "@/lib/coach-nutrition";
import { weeklyWindowStart } from "@/lib/coach-volume";
import { NutritionDashboard } from "@/components/nutrition-dashboard";
import { Apple, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const user = await requireUser();
  const profile = await loadCoachProfile();
  const date = todayKey();
  const yKey = yesterdayKey();
  const isoToday = isoWeekdayToday();

  const [program, recent, todayRow, entries] = await Promise.all([
    db.program.findFirst({
      where: { userId: user.id, active: true },
      select: { weekdays: true },
    }),
    db.workout.findMany({
      where: { userId: user.id, finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 14,
      select: {
        startedAt: true,
        exercises: { select: { sets: { select: { isCompleted: true, setType: true } } } },
      },
    }),
    db.nutritionDay.findUnique({
      where: { userId_date: { userId: user.id, date } },
    }),
    db.nutritionEntry.findMany({
      where: { userId: user.id, date },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const dayKeyOf = (d: Date) => {
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  const trainedToday = recent.some((w) => dayKeyOf(w.startedAt) === date);
  const yWorkout = recent.find((w) => dayKeyOf(w.startedAt) === yKey);
  const hardYesterday = yWorkout
    ? yWorkout.exercises.reduce(
        (n, e) => n + e.sets.filter((s) => s.isCompleted && s.setType !== "warmup").length,
        0,
      ) >= 12
    : false;
  const weekAgo = weeklyWindowStart();
  const weekTrainingDays = new Set(
    recent
      .filter((w) => w.startedAt.getTime() >= weekAgo)
      .map((w) => dayKeyOf(w.startedAt)),
  ).size;

  const progWeekdays = (program?.weekdays || "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => n >= 1 && n <= 7);
  const isTrainingDay = trainedToday || progWeekdays.includes(isoToday);

  const targets = nutritionTargets(profile, { isTrainingDay, age: age(profile) });

  if (!targets) {
    return (
      <div className="space-y-5">
        <PageHeader title="Ernährung" subtitle="Dein Ernährungs-Coach" />
        <Card className="space-y-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Apple className="size-5 text-primary" />
            <h2 className="font-semibold">Erst dein Profil ausfüllen</h2>
          </div>
          <p className="text-sm text-muted">
            Für persönliche Ernährungsziele (Kalorien, Protein & Co.) brauche ich
            mindestens dein <span className="font-medium text-foreground">Körpergewicht</span>
            {" "}– am besten auch Größe, Alter und Geschlecht.
          </p>
          <Link
            href="/profile"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Pencil className="size-4" /> Im Profil eintragen
          </Link>
        </Card>
      </div>
    );
  }

  const consumed = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const coach = foodCoach(targets, consumed);

  let checkedSupps: string[] = [];
  try {
    const v = JSON.parse(todayRow?.checkedJson ?? "[]");
    if (Array.isArray(v)) checkedSupps = v as string[];
  } catch {
    checkedSupps = [];
  }

  const tips = nutritionTips(profile, {
    isTrainingDay,
    trainedToday,
    hardYesterday,
    weekTrainingDays,
    proteinTargetHitRate: null,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ernährung"
        subtitle="Trag ein, was du isst – je genauer, desto besser hilft der Coach"
      />
      <NutritionDashboard
        date={date}
        targets={targets}
        consumed={consumed}
        entries={entries.map((e) => ({
          id: e.id,
          name: e.name,
          kcal: e.kcal,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
        }))}
        coach={coach}
        supplements={supplementItems()}
        checkedSupps={checkedSupps}
        waterMl={todayRow?.waterMl ?? 0}
        tips={tips}
      />
    </div>
  );
}
