import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";
import { createExercise } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewExercisePage() {
  const [muscles, equipment] = await Promise.all([
    db.muscleGroup.findMany({ orderBy: { nameDe: "asc" } }),
    db.equipment.findMany({ orderBy: { nameDe: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Übungen
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Eigene Übung</h1>

      <form action={createExercise} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <Input name="nameDe" placeholder="z.B. Bizeps Curls Spider" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Hauptmuskel</label>
          <Select name="primaryMuscleId" required defaultValue="">
            <option value="" disabled>
              Wählen…
            </option>
            {muscles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameDe}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Gerät</label>
          <Select name="equipmentId" defaultValue="">
            <option value="">– kein Gerät –</option>
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nameDe}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Typ</label>
          <Select name="mechanic" defaultValue="isolation">
            <option value="isolation">Isolation</option>
            <option value="compound">Verbund</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Ausführung (optional)
          </label>
          <textarea
            name="instructions"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Hinweise zur Technik…"
          />
        </div>

        <Button type="submit" className="w-full">
          Übung speichern
        </Button>
      </form>
    </div>
  );
}
