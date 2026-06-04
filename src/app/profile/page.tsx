import Link from "next/link";
import { PageHeader, Card, Button, InfoBox } from "@/components/ui";
import { logout } from "@/lib/actions";
import { loadCoachProfile } from "@/lib/coach-data";
import { sessionAdvice } from "@/lib/coach";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CoachProfileForm } from "@/components/coach-profile-form";
import { AvatarUploader } from "@/components/avatar-uploader";
import { TitlesView, type TitleRow } from "@/components/titles-view";
import {
  statsFromWorkouts,
  addNutrition,
  evaluateAchievements,
} from "@/lib/achievements";
import { evaluateTitles } from "@/lib/titles";
import {
  Sparkles,
  ShieldCheck,
  LogOut,
  Activity,
  Award,
  Lightbulb,
  BookOpen,
  BadgeCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [p, user, equipment] = await Promise.all([
    loadCoachProfile(),
    getCurrentUser(),
    db.equipment.findMany({
      select: { slug: true, nameDe: true },
      orderBy: { nameDe: "asc" },
    }),
  ]);

  // Stats + freigeschaltete Titel des Nutzers (für die Titel-Auswahl).
  let titleRows: TitleRow[] = [];
  let equippedTitle = "";
  if (user) {
    const [workouts, entries, days, settings] = await Promise.all([
      db.workout.findMany({
        where: { userId: user.id, finishedAt: { not: null } },
        select: {
          startedAt: true,
          exercises: {
            select: {
              exerciseId: true,
              exercise: { select: { primaryMuscle: { select: { slug: true } } } },
              sets: { select: { weight: true, reps: true, isCompleted: true, setType: true } },
            },
          },
        },
      }),
      db.nutritionEntry.findMany({ where: { userId: user.id }, select: { date: true, protein: true } }),
      db.nutritionDay.findMany({ where: { userId: user.id }, select: { waterMl: true } }),
      db.settings.findUnique({ where: { userId: user.id }, select: { equippedTitle: true } }),
    ]);
    const stats = addNutrition(
      statsFromWorkouts(
        workouts.map((w) => ({
          startedAt: w.startedAt,
          exercises: w.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            muscleSlug: e.exercise.primaryMuscle.slug,
            sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps, isCompleted: s.isCompleted, setType: s.setType })),
          })),
        })),
      ),
      { entries: entries.map((e) => ({ date: e.date, protein: e.protein })), waterByDay: days.map((d) => d.waterMl) },
    );
    const earnedCount = evaluateAchievements(stats).filter((a) => a.earned).length;
    titleRows = evaluateTitles({ stats, earnedCount }).map((tt) => ({
      id: tt.title.id,
      name: tt.title.name,
      rarity: tt.title.rarity,
      condition: tt.title.condition,
      hidden: !!tt.title.hidden,
      unlocked: tt.unlocked,
    }));
    equippedTitle = settings?.equippedTitle ?? "";
  }

  // Personalisierte Coach-Tipps aus dem gespeicherten Profil.
  const tips = sessionAdvice(p);

  const links = [
    {
      href: "/analysis",
      Icon: Activity,
      title: "Coach-Analyse",
      desc: "Score, Wochenvolumen, Bereitschaft & Prognose.",
    },
    {
      href: "/leaderboard",
      Icon: Award,
      title: "Bestenliste & Achievements",
      desc: "Dein Rang und freigeschaltete Erfolge.",
    },
    {
      href: "/wissen",
      Icon: BookOpen,
      title: "Trainingswissen",
      desc: "Volumen, Progression, Erholung, Ernährung & mehr.",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach & Profil"
        subtitle="Dein Profil, Coach-Einstellungen und mehr – alles an einem Ort."
      />

      {/* Identität */}
      {user && (
        <div className="reveal">
          <AvatarUploader
            name={user.displayName ?? user.username}
            username={user.username}
            avatar={user.avatar}
          />
        </div>
      )}

      {/* Titel auswählen */}
      {user && titleRows.length > 0 && (
        <div className="reveal" style={{ animationDelay: "40ms" }}>
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-primary" />
              <h2 className="font-semibold">Titel</h2>
            </div>
            <p className="-mt-1 text-xs text-muted">
              Rüste einen freigeschalteten Titel aus – er erscheint in der
              Bestenliste unter deinem Namen.
            </p>
            <TitlesView rows={titleRows} equipped={equippedTitle} onlyUnlocked />
          </Card>
        </div>
      )}

      {/* Schnellzugriff */}
      <section className="reveal space-y-2" style={{ animationDelay: "60ms" }}>
        <h2 className="text-sm font-semibold text-muted">Mehr entdecken</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex-col sm:items-start"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 transition-transform group-hover:scale-105">
                <l.Icon className="size-5 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-xs text-muted">{l.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Coach-Einleitung */}
      <div className="reveal" style={{ animationDelay: "120ms" }}>
        <Card className="flex items-start gap-3 border-primary/30 bg-primary/10">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted">
            Der Coach schätzt aus deinen Trainingsdaten dein Maximum je Übung und
            empfiehlt im Workout live Gewicht und Wiederholungen. Er passt sich an,
            wenn du mehr schaffst — und testet, wie weit du gehen kannst.
          </p>
        </Card>
      </div>

      {/* Personalisierte Coach-Tipps + Begriffs-Erklärung */}
      {tips.length > 0 && (
        <div className="reveal" style={{ animationDelay: "160ms" }}>
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="font-semibold">Coach-Tipps für dich</h2>
          </div>
          <ul className="space-y-2">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ul>
          <InfoBox>
            <span className="font-semibold text-foreground">RPE & RIR:</span> Der
            RPE (1–10) sagt, wie schwer ein Satz war; RIR (Reps in Reserve) sind
            die Wiederholungen, die am Satzende noch möglich wären. RPE&nbsp;8 ≈
            2 RIR (zwei saubere Wdh. hätten noch gepasst). Trägst du den RPE ein,
            steuert der Coach Last und Pausen spürbar genauer.
          </InfoBox>
        </Card>
        </div>
      )}

      <div className="reveal" style={{ animationDelay: "200ms" }}>
        <CoachProfileForm profile={p} equipment={equipment} />
      </div>

      {/* Konto (v. a. für Mobil, wo die Sidebar fehlt) */}
      <Card className="space-y-3 md:hidden">
        <h2 className="font-semibold">Konto</h2>
        {user && (
          <p className="text-sm text-muted">
            Angemeldet als{" "}
            <span className="font-medium text-foreground">{user.username}</span>
          </p>
        )}
        {user?.isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-border"
          >
            <ShieldCheck className="size-4 text-primary" />
            Admin · Benutzer verwalten
          </Link>
        )}
        <form action={logout}>
          <Button type="submit" variant="secondary" className="w-full">
            <LogOut className="size-4" /> Abmelden
          </Button>
        </form>
      </Card>
    </div>
  );
}
