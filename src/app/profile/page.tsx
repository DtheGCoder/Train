import Link from "next/link";
import { PageHeader, Card, Button } from "@/components/ui";
import { logout } from "@/lib/actions";
import { loadCoachProfile } from "@/lib/coach-data";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CoachProfileForm } from "@/components/coach-profile-form";
import { Sparkles, ShieldCheck, LogOut } from "lucide-react";

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
