import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight, Plus, Sparkles, Globe, Users, Download } from "lucide-react";
import { PageHeader, Card, Input, Button, EmptyState } from "@/components/ui";
import { createRoutine, cloneRoutine } from "@/lib/actions";

export const dynamic = "force-dynamic";

type RoutineRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  isPublic?: boolean;
  _count: { exercises: number };
};

type CommunityRow = RoutineRow & { author: string };

function RoutineList({ routines }: { routines: RoutineRow[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {routines.map((r) => (
        <li key={r.id}>
          <Link
            href={`/routines/${r.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-2"
          >
            <div className="flex items-center gap-3">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: r.color }}
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {r.name}
                  {r.isPublic && (
                    <Globe className="size-3.5 shrink-0 text-success" />
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {r._count.exercises} Übungen
                  {r.description ? ` · ${r.description}` : ""}
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CommunityList({ routines }: { routines: CommunityRow[] }) {
  return (
    <ul className="space-y-2">
      {routines.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: r.color }}
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted">
                {r._count.exercises} Übungen · von {r.author}
                {r.description ? ` · ${r.description}` : ""}
              </p>
            </div>
          </div>
          <form action={cloneRoutine.bind(null, r.id)} className="shrink-0">
            <Button type="submit" variant="secondary">
              <Download className="size-4" /> Übernehmen
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default async function RoutinesPage() {
  const user = await requireUser();
  const [routines, communityRaw] = await Promise.all([
    db.routine.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { exercises: true } } },
    }),
    // Öffentliche, selbst erstellte Vorlagen anderer Nutzer (keine Presets).
    db.routine.findMany({
      where: { isPublic: true, isPreset: false, userId: { not: user.id } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        _count: { select: { exercises: true } },
        user: { select: { username: true } },
      },
    }),
  ]);

  const presets = routines.filter((r) => r.isPreset);
  const custom = routines.filter((r) => !r.isPreset);
  const community: CommunityRow[] = communityRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    _count: r._count,
    author: r.user?.username ?? "unbekannt",
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trainingspläne"
        subtitle="Vorlagen & eigene Routinen für wiederkehrende Workouts"
      />

      <Card>
        <form action={createRoutine} className="flex gap-2">
          <Input name="name" placeholder="Neuer Plan, z.B. Push Day" required />
          <Button type="submit">
            <Plus className="size-4" /> Anlegen
          </Button>
        </form>
      </Card>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Sparkles className="size-4 text-primary" /> Vorlagen
        </h2>
        {presets.length === 0 ? (
          <p className="text-sm text-muted">Keine Vorlagen vorhanden.</p>
        ) : (
          <RoutineList routines={presets} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Deine Pläne</h2>
        {custom.length === 0 ? (
          <EmptyState
            title="Noch keine eigenen Pläne"
            description="Lege oben einen Plan an oder speichere ein Workout aus dem Verlauf als Vorlage."
          />
        ) : (
          <RoutineList routines={custom} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Users className="size-4 text-primary" /> Community-Vorlagen
        </h2>
        {community.length === 0 ? (
          <p className="text-sm text-muted">
            Noch keine geteilten Vorlagen. Gib eigene Pläne über den Schalter im
            Plan frei, damit andere sie nutzen können.
          </p>
        ) : (
          <CommunityList routines={community} />
        )}
      </section>
    </div>
  );
}
