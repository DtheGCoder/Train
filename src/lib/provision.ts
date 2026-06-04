// Provisionierung: globale Stammdaten (Muskeln/Equipment) und pro-Nutzer-Inhalte
// (eigener Übungskatalog, Vorlagen-Routinen, Default-Einstellungen).
//
// Relative Imports (kein "@/"-Alias!), damit dieses Modul sowohl aus dem
// tsx-Seed-Skript als auch aus den Next-Server-Actions importierbar ist.
import type { PrismaClient } from "../generated/prisma/client";
import {
  muscleGroups,
  equipment,
  exercises,
  presets,
  TIME_EXERCISE_NAMES,
} from "./seed-data";

// Akzeptiert sowohl den vollen PrismaClient als auch einen Transaktions-Client.
type Db = Pick<
  PrismaClient,
  "muscleGroup" | "equipment" | "exercise" | "routine" | "routineExercise" | "settings"
>;

/**
 * Globale Taxonomie (Muskelgruppen + Equipment) sicherstellen.
 * Diese Daten sind bewusst NICHT pro Nutzer — es sind Stammdaten, keine
 * Trainingsdaten. Idempotent via upsert auf slug.
 */
export async function provisionTaxonomy(db: Db) {
  for (const m of muscleGroups) {
    await db.muscleGroup.upsert({ where: { slug: m.slug }, update: m, create: m });
  }
  for (const eq of equipment) {
    await db.equipment.upsert({ where: { slug: eq.slug }, update: eq, create: eq });
  }
}

/**
 * Legt für einen Nutzer seinen eigenen Übungskatalog, die Vorlagen-Routinen und
 * die Default-Einstellungen an. Idempotent: hat der Nutzer bereits Übungen,
 * werden nur noch die Settings sichergestellt.
 *
 * Setzt voraus, dass provisionTaxonomy(db) bereits gelaufen ist (globale
 * Muskel-/Equipment-Einträge existieren).
 */
export async function provisionUserContent(db: Db, userId: string) {
  // Settings immer sicherstellen (1:1 pro Nutzer).
  const existingSettings = await db.settings.findUnique({ where: { userId } });
  if (!existingSettings) {
    await db.settings.create({
      data: {
        userId,
        units: "kg",
        theme: "dark",
        goal: "hypertrophy",
        experience: "intermediate",
        coachStyle: "balanced",
      },
    });
  }

  // Bestehenden Katalog des Nutzers laden. Neue Accounts bekommen den vollen
  // Katalog + Vorlagen; bestehende Accounts werden idempotent „aufgefüllt"
  // (fehlende Übungen aus den Stammdaten ergänzt), ohne Duplikate. So landen
  // neue Katalog-Übungen beim nächsten Seed auch bei bestehenden Nutzern.
  const existingEx = await db.exercise.findMany({
    where: { userId },
    select: { id: true, nameDe: true },
  });

  // Slug -> id-Maps aus den globalen Stammdaten.
  const muscleMap = new Map(
    (await db.muscleGroup.findMany()).map((m) => [m.slug, m.id]),
  );
  const equipMap = new Map(
    (await db.equipment.findMany()).map((e) => [e.slug, e.id]),
  );

  // nameDe -> exerciseId (inkl. bereits vorhandener Übungen, für Vorlagen).
  const exByName = new Map<string, string>(existingEx.map((e) => [e.nameDe, e.id]));
  for (const ex of exercises) {
    if (exByName.has(ex.nameDe)) continue; // schon vorhanden -> nicht doppeln
    const primaryMuscleId = muscleMap.get(ex.primary);
    if (!primaryMuscleId) throw new Error(`Unknown muscle slug: ${ex.primary}`);
    const equipmentId = ex.equipment ? equipMap.get(ex.equipment) ?? null : null;

    const created = await db.exercise.create({
      data: {
        nameDe: ex.nameDe,
        nameEn: ex.nameEn,
        primaryMuscleId,
        equipmentId,
        secondaryMuscles: (ex.secondary ?? []).join(","),
        category: ex.category ?? "strength",
        mechanic: ex.mechanic ?? "isolation",
        forceType: ex.force ?? "push",
        trackingType: ex.trackingType ?? "reps",
        instructions: ex.instructions ?? "",
        isCustom: false,
        userId,
      },
    });
    exByName.set(ex.nameDe, created.id);
  }

  // Bestehende Übungen idempotent auf Zeit-Tracking umstellen (Plank, Cardio …).
  await db.exercise.updateMany({
    where: {
      userId,
      nameDe: { in: [...TIME_EXERCISE_NAMES] },
      trackingType: { not: "time" },
    },
    data: { trackingType: "time" },
  });

  // Vorlagen-Routinen idempotent sicherstellen — auch für bestehende Accounts,
  // damit überarbeitete/neue Vorlagen bei allen Nutzern ankommen.
  const presetMeta = (p: (typeof presets)[number]) => ({
    description: p.description,
    goal: p.goal,
    level: p.level,
    location: p.location,
    category: p.category,
    benefits: p.benefits,
  });

  const existingPresets = await db.routine.findMany({
    where: { userId, isPreset: true },
    select: { id: true, name: true },
  });
  const existingPresetNames = new Set(existingPresets.map((r) => r.name));
  const presetNames = new Set(presets.map((p) => p.name));

  for (const preset of presets) {
    if (existingPresetNames.has(preset.name)) {
      // Metadaten/Beschreibung der vorhandenen Vorlage auffrischen (Übungen
      // bleiben unangetastet, falls der Nutzer sie angepasst hat).
      await db.routine.updateMany({
        where: { userId, isPreset: true, name: preset.name },
        data: presetMeta(preset),
      });
      continue;
    }

    const routine = await db.routine.create({
      data: {
        name: preset.name,
        isPreset: true,
        userId,
        ...presetMeta(preset),
      },
    });
    let position = 0;
    for (const [exName, sets, reps] of preset.exercises) {
      const exId = exByName.get(exName);
      if (!exId) {
        console.warn(`  Preset-Übung nicht gefunden: ${exName}`);
        continue;
      }
      await db.routineExercise.create({
        data: {
          routineId: routine.id,
          exerciseId: exId,
          position: position++,
          targetSets: sets,
          targetReps: reps,
          targetRestSec: preset.rest ?? 90,
        },
      });
    }
  }

  // Veraltete Vorlagen aufräumen: nicht mehr im Katalog enthaltene Presets, die
  // der Nutzer nie benutzt hat (keine Workouts), entfernen. Bearbeitete/benutzte
  // bleiben sicherheitshalber erhalten.
  for (const r of existingPresets) {
    if (presetNames.has(r.name)) continue;
    const used = await db.routine
      .findFirst({ where: { id: r.id }, select: { workouts: { take: 1, select: { id: true } } } })
      .then((x) => (x?.workouts.length ?? 0) > 0)
      .catch(() => true);
    if (!used) {
      await db.routine.delete({ where: { id: r.id } }).catch(() => {});
    }
  }
}
