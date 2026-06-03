import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { ChevronRight, Plus, Globe, Users, Download, Sparkles } from "lucide-react";
import { PageHeader, Card, Input, Button, EmptyState } from "@/components/ui";
import { createRoutine, cloneRoutine } from "@/lib/actions";
import { loadCoachProfile } from "@/lib/coach-data";
import {
  recommendPrograms,
  missingProfileForProgram,
  getProgram,
} from "@/lib/program-data";
import { RoutineCatalog, type CatalogItem } from "@/components/routine-catalog";
import {
  CoachPlanSection,
  type ActiveProgram,
  type Recommendation,
  type CoachLogEntry,
} from "@/components/coach-plan-section";

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
  const [routines, communityRaw, profile, activeRaw] = await Promise.all([
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
    loadCoachProfile(),
    db.program.findFirst({
      where: { userId: user.id, active: true },
      include: { days: { orderBy: { position: "asc" } } },
    }),
  ]);

  // Aktives Coach-Programm aufbereiten (mit Übungszahl je Tag).
  let activeProgram: ActiveProgram | null = null;
  if (activeRaw) {
    const seed = getProgram(activeRaw.key);
    const dayRoutines = await db.routine.findMany({
      where: { id: { in: activeRaw.days.map((d) => d.routineId) } },
      select: { id: true, _count: { select: { exercises: true } } },
    });
    const countMap = new Map(
      dayRoutines.map((r) => [r.id, r._count.exercises]),
    );
    let coachLog: CoachLogEntry[] = [];
    try {
      const parsed = JSON.parse(activeRaw.coachLogJson || "[]");
      if (Array.isArray(parsed)) coachLog = parsed as CoachLogEntry[];
    } catch {
      coachLog = [];
    }
    activeProgram = {
      id: activeRaw.id,
      name: activeRaw.name,
      description: activeRaw.description,
      goal: activeRaw.goal,
      level: activeRaw.level,
      daysPerWeek: activeRaw.daysPerWeek,
      cursor: activeRaw.cursor,
      cycles: activeRaw.cycles,
      schedule: seed?.schedule ?? "",
      benefits: seed?.benefits ?? "",
      coachLog,
      days: activeRaw.days.map((d) => ({
        id: d.id,
        label: d.label,
        focus: d.focus,
        routineId: d.routineId,
        exerciseCount: countMap.get(d.routineId) ?? 0,
      })),
    };
  }

  const recommendations: Recommendation[] = recommendPrograms(profile)
    .slice(0, 3)
    .map((m) => ({
      key: m.program.key,
      name: m.program.name,
      description: m.program.description,
      goal: m.program.goal,
      level: m.program.level,
      location: m.program.location,
      daysPerWeek: m.program.daysPerWeek,
      schedule: m.program.schedule,
      benefits: m.program.benefits,
      reasons: m.reasons,
      dayLabels: m.program.days.map((d) => d.label),
    }));
  const gaps = missingProfileForProgram(profile);

  // Vorlagen-Katalog (Presets) für die filterbare Liste.
  const presetItems: CatalogItem[] = routines
    .filter((r) => r.isPreset)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      goal: r.goal,
      level: r.level,
      location: r.location,
      benefits: r.benefits,
      exerciseCount: r._count.exercises,
      color: r.color,
    }));

  // Eigene Pläne (ohne Presets und ohne Programm-Tages-Routinen).
  const custom = routines.filter((r) => !r.isPreset && !r.fromProgram);
  const community: CommunityRow[] = communityRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    _count: r._count,
    author: r.user?.username ?? "unbekannt",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainingspläne"
        subtitle="Coach-Pläne, Vorlagen & eigene Routinen für jedes Ziel"
      />

      <CoachPlanSection
        activeProgram={activeProgram}
        recommendations={recommendations}
        gaps={gaps}
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Sparkles className="size-4 text-primary" /> Vorlagen
          <span className="font-normal">({presetItems.length})</span>
        </h2>
        {presetItems.length === 0 ? (
          <p className="text-sm text-muted">Keine Vorlagen vorhanden.</p>
        ) : (
          <RoutineCatalog items={presetItems} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Deine Pläne</h2>
        <Card>
          <form action={createRoutine} className="flex gap-2">
            <Input name="name" placeholder="Neuer Plan, z.B. Push Day" required />
            <Button type="submit">
              <Plus className="size-4" /> Anlegen
            </Button>
          </form>
        </Card>
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
