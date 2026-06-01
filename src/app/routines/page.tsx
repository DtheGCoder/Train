import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { PageHeader, Card, Input, Button, EmptyState } from "@/components/ui";
import { createRoutine } from "@/lib/actions";

export const dynamic = "force-dynamic";

type RoutineRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  _count: { exercises: number };
};

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
                <p className="font-medium">{r.name}</p>
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

export default async function RoutinesPage() {
  const routines = await db.routine.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { exercises: true } } },
  });

  const presets = routines.filter((r) => r.isPreset);
  const custom = routines.filter((r) => !r.isPreset);

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
    </div>
  );
}
