import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card, EmptyState, LinkButton, InfoBox } from "@/components/ui";
import { loadCoachProfile } from "@/lib/coach-data";
import {
  aggregateWeekly,
  volumeInsights,
  weeklyWindowStart,
  nowMs,
  type SetEntry,
} from "@/lib/coach-volume";
import { age } from "@/lib/coach";
import { readiness } from "@/lib/coach-readiness";
import { nutritionTargets } from "@/lib/coach-nutrition";
import { WeeklyVolumeReport } from "@/components/weekly-volume-report";
import { AnalysisTabs } from "@/components/analysis-tabs";
import { HeartPulse, Apple, Rocket } from "lucide-react";
import {
  analyze,
  profileLine,
  type AnalysisWorkout,
  type Severity,
  type Finding,
  type AnalysisSection,
  type PersonalTip,
} from "@/lib/coach-analysis";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Target,
  Dumbbell,
  ClipboardList,
  ArrowUpCircle,
  Wrench,
  Eye,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ---------------- Personalisierter Plan ---------------- */

const TIP_STYLE: Record<
  PersonalTip["kind"],
  { text: string; ring: string; Icon: typeof Info; label: string }
> = {
  do: { text: "text-primary", ring: "border-primary/30", Icon: ArrowUpCircle, label: "Tun" },
  fix: { text: "text-amber-400", ring: "border-amber-400/30", Icon: Wrench, label: "Fixen" },
  watch: { text: "text-danger", ring: "border-danger/30", Icon: Eye, label: "Achtgeben" },
  keep: { text: "text-success", ring: "border-success/30", Icon: CheckCircle, label: "Beibehalten" },
};

function PlanCard({ plan }: { plan: PersonalTip[] }) {
  if (plan.length === 0) return null;
  return (
    <Card className="space-y-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-primary" />
        <h2 className="font-semibold">Dein persönlicher Plan</h2>
      </div>
      <p className="-mt-1 text-xs text-muted">
        Konkret aus deinen Daten abgeleitet – Schritt für Schritt abarbeiten.
      </p>
      <ol className="space-y-2">
        {plan.map((t, i) => {
          const s = TIP_STYLE[t.kind];
          return (
            <li
              key={i}
              className={`flex gap-3 rounded-lg border ${s.ring} bg-surface px-3 py-2.5`}
            >
              <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.text}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{t.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ---------------- Darstellungs-Helfer (Server-Komponenten) ---------------- */

const SEV: Record<
  Severity,
  { text: string; bg: string; ring: string; Icon: typeof Info; label: string }
> = {
  good: {
    text: "text-success",
    bg: "bg-success/10",
    ring: "border-success/30",
    Icon: CheckCircle2,
    label: "Gut",
  },
  info: {
    text: "text-muted",
    bg: "bg-surface-2",
    ring: "border-border",
    Icon: Info,
    label: "Info",
  },
  warning: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "border-amber-400/30",
    Icon: AlertTriangle,
    label: "Warnung",
  },
  critical: {
    text: "text-danger",
    bg: "bg-danger/10",
    ring: "border-danger/30",
    Icon: XCircle,
    label: "Kritisch",
  },
};

function scoreColor(score: number): string {
  if (score >= 78) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 45) return "text-amber-400";
  return "text-danger";
}

function scoreBar(score: number): string {
  if (score >= 78) return "bg-success";
  if (score >= 60) return "bg-primary";
  if (score >= 45) return "bg-amber-400";
  return "bg-danger";
}

function FindingRow({ f }: { f: Finding }) {
  const s = SEV[f.severity];
  return (
    <div className={`flex gap-3 rounded-lg border ${s.ring} ${s.bg} px-3 py-2.5`}>
      <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.text}`} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${s.text}`}>{f.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{f.detail}</p>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: AnalysisSection }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{section.title}</h2>
          <p className="mt-0.5 text-xs text-muted">{section.summary}</p>
        </div>
        {section.score !== null && (
          <span className={`shrink-0 text-lg font-bold tabular-nums ${scoreColor(section.score)}`}>
            {section.score}
          </span>
        )}
      </div>

      {section.score !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${scoreBar(section.score)}`}
            style={{ width: `${section.score}%` }}
          />
        </div>
      )}

      {section.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {section.metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-sm font-bold tabular-nums">{m.value}</p>
              <p className="text-[11px] leading-tight text-muted">{m.label}</p>
              {m.sub && <p className="text-[10px] text-muted">{m.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {section.findings.length > 0 && (
        <div className="space-y-2">
          {section.findings.map((f, i) => (
            <FindingRow key={i} f={f} />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Seite ---------------- */

export default async function AnalysisPage() {
  const user = await requireUser();
  const [profile, workoutsRaw, catalogRaw] = await Promise.all([
    loadCoachProfile(),
    db.workout.findMany({
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
    }),
    db.exercise.findMany({
      where: { userId: user.id },
      select: { primaryMuscle: { select: { nameDe: true, bodyRegion: true } } },
    }),
  ]);

  const workouts: AnalysisWorkout[] = workoutsRaw.map((w) => ({
    id: w.id,
    startedAt: w.startedAt,
    finishedAt: w.finishedAt,
    exercises: w.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      name: we.exercise.nameDe,
      muscle: we.exercise.primaryMuscle.nameDe,
      muscleSlug: we.exercise.primaryMuscle.slug,
      secondarySlugs: we.exercise.secondaryMuscles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bodyRegion: we.exercise.primaryMuscle.bodyRegion,
      mechanic: we.exercise.mechanic,
      forceType: we.exercise.forceType,
      sets: we.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        isCompleted: s.isCompleted,
        setType: s.setType,
      })),
    })),
  }));

  const catalog = catalogRaw.map((e) => ({
    nameDe: e.primaryMuscle.nameDe,
    bodyRegion: e.primaryMuscle.bodyRegion,
  }));

  const a = analyze(profile, workouts, catalog);

  // Wochenvolumen je Muskel (letzte 7 Tage) – übergreifende Coach-Intelligenz.
  const weekAgo = weeklyWindowStart();
  const weeklyEntries: SetEntry[] = [];
  for (const w of workoutsRaw) {
    if (!w.finishedAt || w.startedAt.getTime() < weekAgo) continue;
    const day = w.startedAt.toISOString().slice(0, 10);
    for (const we of w.exercises) {
      const hard = we.sets.filter(
        (s) =>
          s.isCompleted &&
          s.setType !== "warmup" &&
          (s.weight > 0 || s.reps > 0 || s.durationSec > 0),
      ).length;
      if (hard === 0) continue;
      const primary = we.exercise.primaryMuscle.slug;
      const secondary = we.exercise.secondaryMuscles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = 0; i < hard; i++) weeklyEntries.push({ primary, secondary, day });
    }
  }
  const weeklyGroups = aggregateWeekly(weeklyEntries, profile);
  const weeklyVol = volumeInsights(weeklyGroups);

  if (!a.hasData) {
    return (
      <div className="space-y-5">
        <PageHeader title="Coach-Analyse" subtitle="Die schonungslos ehrliche Auswertung deines Trainings." />
        <EmptyState
          title="Noch keine Daten"
          description={a.verdict}
          action={<LinkButton href="/">Erstes Workout starten</LinkButton>}
        />
      </div>
    );
  }

  const trendIcon = { up: TrendingUp, flat: Minus, down: TrendingDown };
  const trendColor = { up: "text-success", flat: "text-muted", down: "text-danger" };

  // ---- Readiness / Auto-Regulation ----
  const lastW = workouts[workouts.length - 1];
  const daysSinceLast = lastW
    ? Math.floor((nowMs() - lastW.startedAt.getTime()) / 86_400_000)
    : null;
  const last7Count = workouts.filter(
    (w) => w.startedAt.getTime() >= weeklyWindowStart(),
  ).length;
  const volOf = (w: AnalysisWorkout) =>
    w.exercises.reduce(
      (s, e) =>
        s +
        e.sets
          .filter((x) => x.isCompleted)
          .reduce((a, x) => a + x.weight * x.reps, 0),
      0,
    );
  const lastVol = lastW ? volOf(lastW) : 0;
  const prevVols = workouts.slice(-4, -1).map(volOf);
  const avgPrev = prevVols.length
    ? prevVols.reduce((a, b) => a + b, 0) / prevVols.length
    : 0;
  const lastHardSets = lastW
    ? lastW.exercises.reduce(
        (n, e) =>
          n + e.sets.filter((x) => x.isCompleted && x.setType !== "warmup").length,
        0,
      )
    : 0;
  const trainedToday = daysSinceLast === 0;
  const rd = readiness({
    daysSinceLast,
    last7Count,
    targetDays: profile.trainingDaysPerWeek ?? 3,
    lastHardSets,
    volumeTrendDown: avgPrev > 0 && lastVol < avgPrev * 0.9,
  });
  const rdTone = {
    fresh: "text-success",
    ready: "text-primary",
    tired: "text-amber-400",
  }[rd.tone];

  // ---- PR-Prognose (aufsteigende Lifts) ----
  const forecasts = a.lifts
    .filter((l) => l.trend === "up" && l.lastE1RM > l.firstE1RM && l.sessions >= 2)
    .map((l) => {
      const per = (l.lastE1RM - l.firstE1RM) / Math.max(1, l.sessions - 1);
      const next = (Math.floor(l.lastE1RM / 5) + 1) * 5;
      const togo = per > 0 ? Math.ceil((next - l.lastE1RM) / per) : 0;
      return { name: l.name, next, togo, per: Math.round(per * 10) / 10 };
    })
    .filter((f) => f.togo > 0 && f.togo <= 20)
    .slice(0, 5);

  // ---- Ernährungs-Kurzfazit ----
  const nTargets = nutritionTargets(profile, {
    isTrainingDay: trainedToday,
    age: age(profile),
  });

  const overviewTab = (
    <>
      {/* Gesamturteil */}
      <Card className="space-y-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-4">
          <div
            className={`flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-surface ${scoreColor(a.score)}`}
          >
            <span className={`text-2xl font-extrabold tabular-nums ${scoreColor(a.score)}`}>
              {a.score}
            </span>
            <span className="text-[10px] text-muted">/ 100</span>
          </div>
          <div className="min-w-0">
            <p className={`text-lg font-bold ${scoreColor(a.score)}`}>{a.grade}</p>
            <p className="text-xs text-muted">{profileLine(profile)}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Stand: {format(a.generatedAt, "dd.MM.yyyy HH:mm", { locale: de })}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{a.verdict}</p>
      </Card>

      {/* Readiness / Auto-Regulation */}
      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <HeartPulse className={`size-5 ${rdTone}`} />
          <h2 className="font-semibold">Heutige Bereitschaft</h2>
          <span className={`ml-auto text-sm font-bold ${rdTone}`}>{rd.label}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${rd.score}%` }}
          />
        </div>
        <p className="text-sm leading-snug text-muted">{rd.advice}</p>
      </Card>

      <InfoBox>
        <span className="font-semibold text-foreground">So liest du das:</span>{" "}
        Der Score (0–100) fasst mehrere Bereiche zusammen – Konsistenz, Volumen,
        Muskelbalance, Kraftentwicklung, Intensität & Zielausrichtung. Er rechnet
        rein mit deinen eigenen Daten, offline und nachvollziehbar. Arbeite die
        Punkte im Plan von oben nach unten ab – das bewegt am meisten.
      </InfoBox>

      {/* Persönlicher, datengetriebener Plan */}
      <PlanCard plan={a.plan} />

      {/* Prioritäten */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <h2 className="font-semibold">Deine Prioritäten</h2>
        </div>
        <ol className="space-y-2">
          {a.priorities.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="leading-snug">{p}</span>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );

  const bodyTab = (
    <>
      {/* Wochenvolumen je Muskel (7 Tage) */}
      <WeeklyVolumeReport groups={weeklyGroups} insights={weeklyVol} />

      {/* Detailbereiche (Balance, Muskelgruppen …) */}
      {a.sections.map((s) => (
        <SectionCard key={s.key} section={s} />
      ))}
    </>
  );

  const progressTab = (
    <>
      {/* PR-Prognose */}
      {forecasts.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Rocket className="size-5 text-primary" />
            <h2 className="font-semibold">PR-Prognose</h2>
          </div>
          <ul className="space-y-2">
            {forecasts.map((f) => (
              <li
                key={f.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{f.name}</span>
                  <span className="text-xs text-muted">
                    +{f.per} kg / Einheit im Schnitt
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold tabular-nums text-primary">
                    {f.next} kg
                  </span>
                  <span className="text-[11px] text-muted">
                    in ~{f.togo} {f.togo === 1 ? "Einheit" : "Einheiten"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted">
            Hochgerechnet aus deinem bisherigen Tempo (geschätztes 1RM). Bei
            gutem Schlaf & Ernährung realistisch – Plateaus sind normal.
          </p>
        </Card>
      )}

      {/* Kraftentwicklung je Übung (Tabelle) */}
      {a.lifts.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <h2 className="font-semibold">Kraftverlauf je Übung</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Übung</th>
                  <th className="px-2 py-2 text-right font-medium">Start</th>
                  <th className="px-2 py-2 text-right font-medium">Aktuell</th>
                  <th className="px-3 py-2 text-right font-medium">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.lifts.map((l) => {
                  const TI = trendIcon[l.trend];
                  return (
                    <tr key={l.name}>
                      <td className="px-3 py-2">
                        <span className="line-clamp-1">{l.name}</span>
                        <span className="text-[11px] text-muted">{l.sessions} Einheiten</span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted">
                        {l.firstE1RM} kg
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">
                        {l.lastE1RM} kg
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${trendColor[l.trend]}`}>
                        <span className="inline-flex items-center justify-end gap-1">
                          <TI className="size-3.5" />
                          {l.changePct > 0 ? "+" : ""}
                          {l.changePct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">
            Werte sind geschätzte Maxima (1RM, Epley-Formel) aus deinen besten Sätzen.
          </p>
        </Card>
      )}

      {/* Kraftstandards */}
      {a.standards.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Kraftstandards (relativ zum Körpergewicht)</h2>
          <div className="space-y-2">
            {a.standards.map((st) => (
              <div key={st.name} className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{st.name}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {st.ratio}× KG
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">{st.level}</span>
                  {st.nextLevel && st.nextRatio !== null && (
                    <span className="text-muted">
                      bis {st.nextLevel}: {st.nextRatio}× KG
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            Richtwerte als Orientierung — keine absolute Wahrheit. Sie hängen von
            Technik, Hebeln und Tagesform ab.
          </p>
        </Card>
      )}
    </>
  );

  const nutritionTab = (
    <>
      <Card className="space-y-3 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Apple className="size-5 text-primary" />
          <h2 className="font-semibold">Ernährung & Training</h2>
        </div>
        {nTargets ? (
          <>
            <p className="text-sm text-muted">
              {trainedToday ? "Trainingstag" : "Heute"} · {nTargets.goalLabel}.
              Richtwerte für heute:
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { v: nTargets.kcal, l: "kcal" },
                { v: `${nTargets.protein} g`, l: "Protein" },
                { v: `${nTargets.carbs} g`, l: "Carbs" },
                { v: `${nTargets.fat} g`, l: "Fett" },
              ].map((x) => (
                <div key={x.l} className="rounded-lg bg-surface p-2">
                  <p className="text-base font-extrabold tabular-nums">{x.v}</p>
                  <p className="text-[10px] text-muted">{x.l}</p>
                </div>
              ))}
            </div>
            <Link
              href="/nutrition"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Apple className="size-4" /> Zum Ernährungs-Coach
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Für persönliche Ernährungsziele brauche ich dein Körpergewicht
              (und idealerweise Größe, Alter, Geschlecht).
            </p>
            <Link
              href="/profile"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Im Profil eintragen →
            </Link>
          </>
        )}
      </Card>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach-Analyse"
        subtitle="Schonungslos ehrlich, übersichtlich gegliedert."
      />

      <AnalysisTabs
        overview={overviewTab}
        body={bodyTab}
        progress={progressTab}
        nutrition={nutritionTab}
      />

      <p className="px-1 text-center text-[11px] text-muted">
        Diese Analyse rechnet rein mit deinen eigenen Trainingsdaten — offline,
        ohne KI-Wolke. Sie ersetzt keine medizinische oder physiotherapeutische
        Beratung.
      </p>

      <div className="flex justify-center">
        <Link href="/profile" className="text-sm text-primary hover:underline">
          Coach-Profil anpassen →
        </Link>
      </div>
    </div>
  );
}
