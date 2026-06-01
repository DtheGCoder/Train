import Link from "next/link";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { updateCoachProfile, logout } from "@/lib/actions";
import { loadCoachProfile } from "@/lib/coach-data";
import { getCurrentUser } from "@/lib/auth";
import {
  GOAL_CONFIG,
  GOAL_LABELS,
  EXPERIENCE_LABELS,
  STYLE_LABELS,
} from "@/lib/coach";
import { Sparkles, ShieldCheck, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default async function ProfilePage() {
  const [p, user] = await Promise.all([loadCoachProfile(), getCurrentUser()]);

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

      <form action={updateCoachProfile} className="space-y-5">
        <Card className="space-y-4">
          <h2 className="font-semibold">Trainingsziel</h2>
          <Field
            label="Ziel"
            hint={`Steuert Wiederholungsbereich (${GOAL_CONFIG[p.goal].repLow}–${GOAL_CONFIG[p.goal].repHigh} Wdh) und Intensität.`}
          >
            <Select name="goal" defaultValue={p.goal}>
              {(Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[]).map(
                (g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]} ({GOAL_CONFIG[g].repLow}–{GOAL_CONFIG[g].repHigh} Wdh)
                  </option>
                ),
              )}
            </Select>
          </Field>

          <Field
            label="Erfahrung"
            hint="Anfänger steigern schneller, Erfahrene in kleineren Schritten."
          >
            <Select name="experience" defaultValue={p.experience}>
              {(
                Object.keys(EXPERIENCE_LABELS) as (keyof typeof EXPERIENCE_LABELS)[]
              ).map((e) => (
                <option key={e} value={e}>
                  {EXPERIENCE_LABELS[e]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Coach-Stil"
            hint="Wie hart soll der Coach dich pushen und ans Limit führen?"
          >
            <Select name="coachStyle" defaultValue={p.coachStyle}>
              {(Object.keys(STYLE_LABELS) as (keyof typeof STYLE_LABELS)[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {STYLE_LABELS[s]}
                  </option>
                ),
              )}
            </Select>
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Über dich</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Geschlecht">
              <Select name="sex" defaultValue={p.sex}>
                <option value="">Keine Angabe</option>
                <option value="m">Männlich</option>
                <option value="f">Weiblich</option>
              </Select>
            </Field>
            <Field label="Geburtsjahr">
              <Input
                name="birthYear"
                type="number"
                inputMode="numeric"
                placeholder="z. B. 1995"
                defaultValue={p.birthYear ?? ""}
              />
            </Field>
            <Field label="Körpergewicht (kg)">
              <Input
                name="bodyweightKg"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="z. B. 80"
                defaultValue={p.bodyweightKg ?? ""}
              />
            </Field>
            <Field label="Größe (cm)">
              <Input
                name="heightCm"
                type="number"
                inputMode="numeric"
                placeholder="z. B. 180"
                defaultValue={p.heightCm ?? ""}
              />
            </Field>
          </div>
        </Card>

        <Button type="submit" className="w-full">
          Speichern
        </Button>
      </form>

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
