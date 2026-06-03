import Link from "next/link";
import { PageHeader, Card, Button, InfoBox } from "@/components/ui";
import { logout } from "@/lib/actions";
import { loadCoachProfile } from "@/lib/coach-data";
import { sessionAdvice } from "@/lib/coach";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CoachProfileForm } from "@/components/coach-profile-form";
import {
  Sparkles,
  ShieldCheck,
  LogOut,
  Activity,
  ChevronRight,
  Lightbulb,
  BookOpen,
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

  // Personalisierte Coach-Tipps aus dem gespeicherten Profil.
  const tips = sessionAdvice(p);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach & Profil"
        subtitle="Damit der Coach realistische Gewichte und Wiederholungen für dich plant."
      />

      <Card className="flex items-start gap-3 border-primary/30 bg-primary/10">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted">
          Der Coach schätzt aus deinen Trainingsdaten dein Maximum je Übung und
          empfiehlt im Workout live Gewicht und Wiederholungen. Er passt sich an,
          wenn du mehr schaffst — und testet, wie weit du gehen kannst. Deine
          Grenzen verschieben sich mit der Zeit von selbst.
        </p>
      </Card>

      <Link
        href="/analysis"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <Activity className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Coach-Analyse ansehen</p>
          <p className="text-sm text-muted">
            Schonungslos ehrliche Auswertung deines Trainings — Konsistenz, Balance,
            Kraftentwicklung und konkrete Prioritäten.
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>

      <Link
        href="/wissen"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <BookOpen className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Trainingswissen</p>
          <p className="text-sm text-muted">
            Die Wissensbasis des Coaches: Volumen, Wiederholungen, Pausen,
            Progression, Erholung, Ernährung & mehr.
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>

      {/* Personalisierte Coach-Tipps + Begriffs-Erklärung */}
      {tips.length > 0 && (
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
      )}

      <CoachProfileForm profile={p} equipment={equipment} />

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
