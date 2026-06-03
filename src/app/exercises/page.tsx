import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, LinkButton } from "@/components/ui";
import { ExerciseBrowser } from "@/components/exercise-browser";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const user = await requireUser();
  const [exercises, muscles, equipment] = await Promise.all([
    db.exercise.findMany({
      where: { userId: user.id },
      include: { primaryMuscle: true, equipment: true },
      orderBy: { nameDe: "asc" },
    }),
    db.muscleGroup.findMany({ orderBy: { nameDe: "asc" } }),
    db.equipment.findMany({ orderBy: { nameDe: "asc" } }),
  ]);

  const items = exercises.map((e) => ({
    id: e.id,
    nameDe: e.nameDe,
    nameEn: e.nameEn,
    muscleSlug: e.primaryMuscle.slug,
    muscleName: e.primaryMuscle.nameDe,
    equipmentSlug: e.equipment?.slug ?? null,
    equipmentName: e.equipment?.nameDe ?? null,
    mechanic: e.mechanic,
    category: e.category,
    isCustom: e.isCustom,
    instructions: e.instructions,
  }));

  return (
    <>
      <PageHeader
        title="Übungen"
        subtitle={`${items.length} Übungen in der Datenbank`}
        action={
          <LinkButton href="/exercises/new" variant="secondary">
            <Plus className="size-4" /> Eigene
          </LinkButton>
        }
      />
      <ExerciseBrowser
        items={items}
        muscles={muscles.map((m) => ({ slug: m.slug, name: m.nameDe }))}
        equipment={equipment.map((e) => ({ slug: e.slug, name: e.nameDe }))}
      />
    </>
  );
}
