"use server";

import { spawn } from "node:child_process";
import path from "node:path";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { epley1RM } from "@/lib/utils";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createSession,
  destroySession,
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { provisionTaxonomy, provisionUserContent } from "@/lib/provision";
import { parseRoutineSets, type RoutineSet } from "@/lib/routine-sets";
import { getVersionInfo } from "@/lib/version";
import { isUpdateActive } from "@/lib/update-status";
import { readUpdateStatus, writeUpdateStatus } from "@/lib/update-status.server";

/* ---------------- Authentifizierung ---------------- */

export type LoginState = { error?: string } | undefined;

// Login: prüft Anmeldedaten und legt eine Session an. Kein Registrieren.
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Bitte Benutzername und Passwort eingeben." };
  }

  const user = await db.user.findUnique({ where: { username } });
  // Auch bei unbekanntem User Hash prüfen, um Timing-Unterschiede zu glätten.
  const ok = await verifyPassword(
    password,
    user?.passwordHash ??
      "scrypt$16384$8$1$00000000000000000000000000000000$00",
  );

  if (!user || !ok) {
    return { error: "Falscher Benutzername oder Passwort." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Admin: neuen User anlegen. Nur für eingeloggte Admins.
export async function createUser(formData: FormData) {
  await requireAdmin();

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";

  if (username.length < 3) return;
  if (password.length < 6) return;

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) return;

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { username, passwordHash, isAdmin },
  });

  // Neuer Nutzer startet mit eigenem Übungskatalog, Vorlagen & Einstellungen.
  await provisionTaxonomy(db);
  await provisionUserContent(db, user.id);

  revalidatePath("/admin");
}

// Admin: User löschen. Sich selbst und den letzten Admin nicht löschbar.
export async function deleteUser(id: string) {
  const me = await requireAdmin();
  if (id === me.id) return;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return;

  if (target.isAdmin) {
    const adminCount = await db.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) return;
  }

  await db.user.delete({ where: { id } });
  revalidatePath("/admin");
}

/* ---------------- Manuelles Update ---------------- */

// Feedback-State für den manuellen Update-Button (useActionState im Client).
export type UpdateState = { ok?: boolean; error?: string } | undefined;

// Admin: startet das Update-Skript manuell, sofern ein Update verfügbar ist.
// Das Skript (scripts/auto-update.sh) macht pull -> install -> migrate ->
// build -> `pm2 reload` und startet damit den laufenden Server neu. Deshalb
// wird es losgelöst (detached) gestartet: die Action kehrt sofort zurück, der
// Neustart passiert im Hintergrund. Eigene Logs schreibt das Skript nach
// logs/auto-update.log.
export async function triggerManualUpdate(): Promise<UpdateState> {
  await requireAdmin();

  // Läuft bereits eins? Dann nicht erneut anstoßen. Schützt vor Doppelklicks,
  // mehreren Tabs und Reload-Spam – und vermeidet parallele Läufe mit dem
  // automatischen Timer.
  const running = await readUpdateStatus();
  if (isUpdateActive(running)) {
    return { error: "Ein Update läuft bereits." };
  }

  // Nur aktualisieren, wenn GitHub wirklich einen neueren Commit hat.
  const version = await getVersionInfo();
  if (version.upToDate === true) {
    return { error: "Bereits aktuell – kein Update verfügbar." };
  }
  if (version.upToDate === null) {
    return {
      error:
        version.error ?? "Update-Status konnte nicht ermittelt werden.",
    };
  }

  // Sofort einen "läuft"-Status schreiben: blockt weitere Klicks (auch nach
  // einem Reload) und das UI zeigt unmittelbar Fortschritt, noch bevor das
  // Skript den ersten Schritt erreicht.
  const now = new Date().toISOString();
  await writeUpdateStatus({
    state: "running",
    step: "start",
    startedAt: now,
    updatedAt: now,
    fromSha: version.currentSha,
    toSha: version.latest?.sha ?? null,
    message: "Update wird vorbereitet…",
    error: "",
  });

  const script = path.join(process.cwd(), "scripts", "auto-update.sh");

  try {
    // Losgelöst starten und Eltern-Prozess entkoppeln, damit der spätere
    // `pm2 reload` nicht diese laufende Anfrage mittendrin abschießt.
    const child = spawn("bash", [script], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (e) {
    // Status auf Fehler setzen, damit der Button wieder erscheint.
    const message =
      e instanceof Error
        ? `Update konnte nicht gestartet werden: ${e.message}`
        : "Update konnte nicht gestartet werden.";
    await writeUpdateStatus({
      state: "error",
      step: "start",
      startedAt: now,
      updatedAt: new Date().toISOString(),
      fromSha: version.currentSha,
      toSha: version.latest?.sha ?? null,
      message: "",
      error: message,
    });
    return { error: message };
  }

  return { ok: true };
}

/* ---------------- Übungen ---------------- */

export async function createExercise(formData: FormData) {
  const user = await requireUser();
  const nameDe = String(formData.get("nameDe") ?? "").trim();
  const primaryMuscleId = String(formData.get("primaryMuscleId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");
  const mechanic = String(formData.get("mechanic") ?? "isolation");
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!nameDe || !primaryMuscleId) return;

  await db.exercise.create({
    data: {
      nameDe,
      nameEn: nameDe,
      primaryMuscleId,
      equipmentId: equipmentId || null,
      mechanic,
      instructions,
      isCustom: true,
      userId: user.id,
    },
  });

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function deleteExercise(id: string) {
  const user = await requireUser();
  await db.exercise.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/exercises");
  redirect("/exercises");
}

/* ---------------- Workouts ---------------- */

export async function startWorkout(routineId?: string) {
  const user = await requireUser();
  let name = "Freies Workout";
  const data: { name: string; routineId?: string; userId: string } = {
    name,
    userId: user.id,
  };

  // Routine nur akzeptieren, wenn sie dem Nutzer gehört.
  const routine = routineId
    ? await db.routine.findFirst({
        where: { id: routineId, userId: user.id },
        include: { exercises: { orderBy: { position: "asc" } } },
      })
    : null;

  if (routine) {
    name = routine.name;
    data.name = name;
    data.routineId = routine.id;
  }

  const workout = await db.workout.create({ data });

  // Übungen + Zielsätze aus Routine übernehmen
  if (routine) {
    for (const re of routine.exercises) {
      const we = await db.workoutExercise.create({
        data: {
          workoutId: workout.id,
          exerciseId: re.exerciseId,
          position: re.position,
          supersetGroup: re.supersetGroup,
        },
      });
      // Individuelle bzw. gleichförmige Sätze aus der Vorlage übernehmen.
      const planned = parseRoutineSets(re);
      let setNo = 0;
      for (const ps of planned) {
        setNo += 1;
        await db.workoutSet.create({
          data: {
            workoutExerciseId: we.id,
            setNumber: setNo,
            reps: ps.reps,
            weight: ps.weight,
            restSec: re.targetRestSec,
          },
        });
      }
    }
  }

  redirect(`/workout/${workout.id}`);
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
) {
  const user = await requireUser();
  // Eigentum am Workout sicherstellen.
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId: user.id },
    select: { id: true },
  });
  if (!workout) throw new Error("Workout nicht gefunden.");

  const count = await db.workoutExercise.count({ where: { workoutId } });
  const we = await db.workoutExercise.create({
    data: { workoutId, exerciseId, position: count },
    include: { exercise: { include: { primaryMuscle: true, equipment: true } } },
  });
  const set = await db.workoutSet.create({
    data: { workoutExerciseId: we.id, setNumber: 1 },
  });
  return { ...we, sets: [set] };
}

export async function removeWorkoutExercise(workoutExerciseId: string) {
  const user = await requireUser();
  await db.workoutExercise.deleteMany({
    where: { id: workoutExerciseId, workout: { userId: user.id } },
  });
}

export async function addSet(workoutExerciseId: string) {
  const user = await requireUser();
  // Eigentum sicherstellen.
  const we = await db.workoutExercise.findFirst({
    where: { id: workoutExerciseId, workout: { userId: user.id } },
    select: { id: true },
  });
  if (!we) throw new Error("Übung nicht gefunden.");

  const last = await db.workoutSet.findFirst({
    where: { workoutExerciseId },
    orderBy: { setNumber: "desc" },
  });
  return db.workoutSet.create({
    data: {
      workoutExerciseId,
      setNumber: (last?.setNumber ?? 0) + 1,
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 0,
      restSec: last?.restSec ?? 0,
    },
  });
}

export async function updateSet(
  setId: string,
  data: {
    weight?: number;
    reps?: number;
    rpe?: number | null;
    setType?: string;
    isCompleted?: boolean;
  },
) {
  const user = await requireUser();
  await db.workoutSet.updateMany({
    where: { id: setId, workoutExercise: { workout: { userId: user.id } } },
    data,
  });
}

export async function deleteSet(setId: string) {
  const user = await requireUser();
  await db.workoutSet.deleteMany({
    where: { id: setId, workoutExercise: { workout: { userId: user.id } } },
  });
}

export async function finishWorkout(workoutId: string, name?: string) {
  const user = await requireUser();
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId: user.id },
    include: { exercises: { include: { sets: true } } },
  });
  if (!workout) return;

  let totalVolume = 0;
  for (const we of workout.exercises) {
    for (const set of we.sets) {
      if (set.isCompleted) totalVolume += set.weight * set.reps;
    }
    // Persönliche Rekorde aktualisieren
    await updatePRsForExercise(we.exerciseId, user.id);
  }

  // Optionaler, vom Nutzer vergebener Name (sonst bleibt der bisherige).
  const cleanName = name?.trim().slice(0, 80);

  await db.workout.update({
    where: { id: workoutId },
    data: {
      finishedAt: new Date(),
      totalVolume,
      ...(cleanName ? { name: cleanName } : {}),
    },
  });

  revalidatePath("/history");
  revalidatePath("/calendar");
  revalidatePath("/");
  // Bewusst KEIN redirect: der Client zeigt erst die Abschluss-Übersicht
  // (inkl. Coach-Fazit) und navigiert selbst, wenn der Nutzer weiterklickt.
}

// Übernimmt die tatsächlich erreichten Werte eines Plan-Workouts zurück in die
// Vorlage: je Übung Sätze, repräsentative Wdh und schwerstes Gewicht. Nur
// Übungen, die in der Vorlage existieren, werden aktualisiert.
export async function applyWorkoutToRoutine(workoutId: string) {
  const user = await requireUser();
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId: user.id },
    select: {
      routineId: true,
      exercises: {
        select: {
          exerciseId: true,
          sets: {
            select: { weight: true, reps: true, isCompleted: true, setType: true },
          },
        },
      },
    },
  });
  if (!workout?.routineId) return;

  const routineExercises = await db.routineExercise.findMany({
    where: { routineId: workout.routineId, routine: { userId: user.id } },
    select: { id: true, exerciseId: true },
  });

  for (const re of routineExercises) {
    const we = workout.exercises.find((e) => e.exerciseId === re.exerciseId);
    if (!we) continue;
    const working = we.sets.filter(
      (s) => s.isCompleted && s.setType !== "warmup" && (s.weight > 0 || s.reps > 0),
    );
    if (working.length === 0) continue;

    // Jeden Satz einzeln übernehmen (individuelle Werte bleiben erhalten).
    const perSet: RoutineSet[] = working.map((s) => ({
      reps: s.reps,
      weight: s.weight,
    }));
    const repCounts = new Map<number, number>();
    for (const s of working) repCounts.set(s.reps, (repCounts.get(s.reps) ?? 0) + 1);
    const targetReps =
      [...repCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      working[0].reps;

    await db.routineExercise.updateMany({
      where: { id: re.id, routine: { userId: user.id } },
      data: {
        setsJson: JSON.stringify(perSet),
        targetSets: perSet.length,
        targetReps,
        targetWeight: Math.max(0, ...perSet.map((s) => s.weight)),
      },
    });
  }

  revalidatePath(`/routines/${workout.routineId}`);
  revalidatePath("/routines");
}

export async function discardWorkout(workoutId: string) {
  const user = await requireUser();
  await db.workout.deleteMany({ where: { id: workoutId, userId: user.id } });
  revalidatePath("/");
  redirect("/");
}

// Einzelnes (abgeschlossenes) Workout aus dem Verlauf löschen. Entfernt es per
// Cascade samt Sätzen und rechnet die persönlichen Rekorde der betroffenen
// Übungen neu, damit das Workout vollständig aus allen Statistiken (Volumen,
// Rekorde, Bestenliste) verschwindet.
export async function deleteWorkout(workoutId: string) {
  const user = await requireUser();
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId: user.id },
    include: { exercises: { select: { exerciseId: true } } },
  });
  if (!workout) return;

  const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))];
  await db.workout.delete({ where: { id: workout.id } });

  // Rekorde der betroffenen Übungen aus den VERBLEIBENDEN Daten neu aufbauen.
  for (const exerciseId of exerciseIds) {
    await recomputePRsForExercise(exerciseId, user.id);
  }

  revalidatePath("/calendar");
  revalidatePath("/stats");
  revalidatePath("/leaderboard");
  revalidatePath("/");
}

// Baut die Rekorde einer Übung komplett neu (löschen + aus den verbleibenden
// abgeschlossenen Sätzen neu berechnen). Wird nach dem Löschen aufgerufen.
async function recomputePRsForExercise(exerciseId: string, userId: string) {
  await db.personalRecord.deleteMany({ where: { exerciseId, userId } });
  const sets = await db.workoutSet.findMany({
    where: {
      workoutExercise: {
        exerciseId,
        workout: { userId, finishedAt: { not: null } },
      },
      isCompleted: true,
    },
  });
  if (sets.length === 0) return;

  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const best1rm = Math.max(...sets.map((s) => epley1RM(s.weight, s.reps)));
  const maxReps = Math.max(...sets.map((s) => s.reps));
  const records: [string, number][] = [
    ["maxWeight", maxWeight],
    ["1rm", best1rm],
    ["maxReps", maxReps],
  ];
  for (const [recordType, value] of records) {
    await db.personalRecord.create({
      data: { exerciseId, recordType, value, userId },
    });
  }
}

async function updatePRsForExercise(exerciseId: string, userId: string) {
  const sets = await db.workoutSet.findMany({
    where: {
      workoutExercise: { exerciseId, workout: { userId } },
      isCompleted: true,
    },
  });
  if (sets.length === 0) return;

  const maxWeight = Math.max(...sets.map((s) => s.weight));
  const best1rm = Math.max(...sets.map((s) => epley1RM(s.weight, s.reps)));
  const maxReps = Math.max(...sets.map((s) => s.reps));

  const records: [string, number][] = [
    ["maxWeight", maxWeight],
    ["1rm", best1rm],
    ["maxReps", maxReps],
  ];

  for (const [recordType, value] of records) {
    const existing = await db.personalRecord.findFirst({
      where: { exerciseId, recordType, userId },
      orderBy: { value: "desc" },
    });
    if (!existing || value > existing.value) {
      await db.personalRecord.create({
        data: { exerciseId, recordType, value, userId },
      });
    }
  }
}

/* ---------------- Routinen ---------------- */

export async function createRoutine(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  const routine = await db.routine.create({
    data: { name, description, userId: user.id },
  });
  revalidatePath("/routines");
  redirect(`/routines/${routine.id}`);
}

export async function saveWorkoutAsRoutine(workoutId: string) {
  const user = await requireUser();
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId: user.id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { sets: true },
      },
    },
  });
  if (!workout) return;

  const routine = await db.routine.create({
    data: {
      name: `${workout.name} (Vorlage)`,
      description: "Aus Workout gespeichert",
      userId: user.id,
    },
  });

  for (const we of workout.exercises) {
    const completed = we.sets.filter((s) => s.isCompleted);
    const used = completed.length > 0 ? completed : we.sets;
    if (used.length === 0) continue;

    // Häufigste Wiederholungszahl als Zielwert
    const repCounts = new Map<number, number>();
    for (const s of used) repCounts.set(s.reps, (repCounts.get(s.reps) ?? 0) + 1);
    const targetReps =
      [...repCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      used[0].reps ||
      10;
    // Schwerstes bewegtes Gewicht als geplantes Arbeitsgewicht.
    const targetWeight = Math.max(0, ...used.map((s) => s.weight));
    // Jeden Satz einzeln festhalten.
    const perSet = used.map((s) => ({ reps: s.reps, weight: s.weight }));

    await db.routineExercise.create({
      data: {
        routineId: routine.id,
        exerciseId: we.exerciseId,
        position: we.position,
        targetSets: used.length,
        targetReps,
        targetWeight,
        setsJson: JSON.stringify(perSet),
        targetRestSec: used[0].restSec || 90,
        supersetGroup: we.supersetGroup,
      },
    });
  }

  revalidatePath("/routines");
  redirect(`/routines/${routine.id}`);
}

/* ---------------- Daten zurücksetzen ---------------- */

// Löscht alle Trainingsdaten: Workouts (inkl. Sätze per Cascade) und Rekorde.
// Übungen, Pläne und das Coach-Profil bleiben erhalten.
export async function resetAllData() {
  const user = await requireUser();
  await db.workout.deleteMany({ where: { userId: user.id } });
  await db.personalRecord.deleteMany({ where: { userId: user.id } });
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/history");
  revalidatePath("/calendar");
  revalidatePath("/exercises");
}

/* ---------------- Coach-Profil ---------------- */

// Feedback-State für das Coach-Profil-Formular (useActionState im Client).
export type CoachProfileState = { ok?: boolean; error?: string } | undefined;

export async function updateCoachProfile(
  _prevState: CoachProfileState,
  formData: FormData,
): Promise<CoachProfileState> {
  const user = await requireUser();
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => {
    const v = parseFloat(str(k).replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };
  const int = (k: string) => {
    const v = parseInt(str(k), 10);
    return Number.isFinite(v) ? v : null;
  };
  // Trainingstage pro Woche auf 1–7 begrenzen (null = keine Angabe).
  const days = (() => {
    const v = int("trainingDaysPerWeek");
    if (v == null) return null;
    return Math.min(7, Math.max(1, v));
  })();
  // Multi-Select Equipment: alle ausgewählten Slugs als CSV speichern.
  const equipment = formData
    .getAll("availableEquipment")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join(",");

  const data = {
    goal: str("goal") || "hypertrophy",
    experience: str("experience") || "intermediate",
    coachStyle: str("coachStyle") || "balanced",
    sex: str("sex"),
    birthYear: int("birthYear"),
    bodyweightKg: num("bodyweightKg"),
    heightCm: num("heightCm"),
    trainingDaysPerWeek: days,
    limitations: str("limitations"),
    availableEquipment: equipment,
    preferredRepStyle: str("preferredRepStyle") || "auto",
  };

  try {
    await db.settings.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteRoutine(id: string) {
  const user = await requireUser();
  await db.routine.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/routines");
  redirect("/routines");
}

/* ---------------- Community-Vorlagen ---------------- */

// Eigene, selbst erstellte Vorlage für die Community freigeben oder zurückziehen.
// Presets (System-Vorlagen) können niemals freigegeben werden.
export async function setRoutineVisibility(
  routineId: string,
  isPublic: boolean,
) {
  const user = await requireUser();
  await db.routine.updateMany({
    where: { id: routineId, userId: user.id, isPreset: false },
    data: { isPublic },
  });
  revalidatePath("/routines");
  revalidatePath("/community");
  revalidatePath(`/routines/${routineId}`);
}

// Öffentliche Community-Vorlage in den eigenen Account übernehmen.
// Es wird nur die Struktur kopiert (keine Trainingsdaten). Übungen werden
// über den Namen auf den eigenen, pro Nutzer provisionierten Katalog gemappt.
export async function cloneRoutine(routineId: string) {
  const user = await requireUser();

  // Nur freigegebene Nutzer-Vorlagen (keine Presets) sind klonbar.
  const src = await db.routine.findFirst({
    where: { id: routineId, isPublic: true, isPreset: false },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: { select: { nameDe: true } } },
      },
    },
  });
  if (!src) throw new Error("Vorlage nicht gefunden.");

  // Übungen des aktuellen Nutzers nach Name indexieren (Übungen sind pro Nutzer).
  const myExercises = await db.exercise.findMany({
    where: { userId: user.id },
    select: { id: true, nameDe: true },
  });
  const byName = new Map(myExercises.map((e) => [e.nameDe, e.id]));

  const routine = await db.routine.create({
    data: {
      name: src.name,
      description: src.description || "Aus Community-Vorlage übernommen",
      color: src.color,
      userId: user.id,
      // Klone bleiben privat und sind keine Presets.
    },
  });

  let position = 0;
  for (const re of src.exercises) {
    const targetId = byName.get(re.exercise.nameDe);
    if (!targetId) continue; // Übung nicht im eigenen Katalog -> überspringen
    await db.routineExercise.create({
      data: {
        routineId: routine.id,
        exerciseId: targetId,
        position: position++,
        targetSets: re.targetSets,
        targetReps: re.targetReps,
        targetRestSec: re.targetRestSec,
        notes: re.notes,
        supersetGroup: re.supersetGroup,
      },
    });
  }

  revalidatePath("/routines");
  redirect(`/routines/${routine.id}`);
}

export async function addRoutineExercise(
  routineId: string,
  exerciseId: string,
) {
  const user = await requireUser();
  // Eigentum an der Routine sicherstellen.
  const routine = await db.routine.findFirst({
    where: { id: routineId, userId: user.id },
    select: { id: true },
  });
  if (!routine) throw new Error("Routine nicht gefunden.");

  const count = await db.routineExercise.count({ where: { routineId } });
  await db.routineExercise.create({
    data: { routineId, exerciseId, position: count },
  });
  revalidatePath(`/routines/${routineId}`);
}

export async function updateRoutineExercise(
  id: string,
  routineId: string,
  data: {
    targetSets?: number;
    targetReps?: number;
    targetWeight?: number;
    targetRestSec?: number;
  },
) {
  const user = await requireUser();
  await db.routineExercise.updateMany({
    where: { id, routine: { userId: user.id } },
    data,
  });
  revalidatePath(`/routines/${routineId}`);
}

export async function removeRoutineExercise(id: string, routineId: string) {
  const user = await requireUser();
  await db.routineExercise.deleteMany({
    where: { id, routine: { userId: user.id } },
  });
  revalidatePath(`/routines/${routineId}`);
}

// Individuelle Sätze einer Plan-Übung setzen (pro Satz Gewicht + Wdh).
export async function updateRoutineExerciseSets(
  id: string,
  routineId: string,
  sets: RoutineSet[],
) {
  const user = await requireUser();
  const clean = sets.slice(0, 30).map((s) => ({
    reps: Math.max(0, Math.round(Number(s.reps) || 0)),
    weight: Math.max(0, Number(s.weight) || 0),
  }));
  if (clean.length === 0) clean.push({ reps: 0, weight: 0 });
  await db.routineExercise.updateMany({
    where: { id, routine: { userId: user.id } },
    data: {
      setsJson: JSON.stringify(clean),
      targetSets: clean.length,
      targetReps: clean[0].reps,
      targetWeight: Math.max(0, ...clean.map((s) => s.weight)),
    },
  });
  revalidatePath(`/routines/${routineId}`);
}

// Reihenfolge der Übungen speichern (nach Drag-and-drop).
export async function reorderRoutineExercises(
  routineId: string,
  orderedIds: string[],
) {
  const user = await requireUser();
  const routine = await db.routine.findFirst({
    where: { id: routineId, userId: user.id },
    select: { id: true },
  });
  if (!routine) return;
  await Promise.all(
    orderedIds.map((id, i) =>
      db.routineExercise.updateMany({ where: { id, routineId }, data: { position: i } }),
    ),
  );
  revalidatePath(`/routines/${routineId}`);
}

// Coach „verbessert" die Vorlage auf Basis der Trainingsregeln:
// 1) Grundübungen nach vorn (mehrgelenkig zuerst, Reihenfolge sonst erhalten).
// 2) Bei fehlendem Gegenspieler (nur Druck, kein Zug – oder umgekehrt) eine
//    passende Grundübung aus dem Katalog ergänzen. Konservativ & nachvollziehbar.
export async function improveRoutine(
  routineId: string,
): Promise<{ messages: string[] }> {
  const user = await requireUser();
  const routine = await db.routine.findFirst({
    where: { id: routineId, userId: user.id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: { select: { nameDe: true, mechanic: true, forceType: true } } },
      },
    },
  });
  if (!routine) return { messages: [] };

  const messages: string[] = [];
  const exs = routine.exercises;

  // 1) Stabile Umsortierung: Grundübungen (compound) vor Isolation.
  const compounds = exs.filter((e) => e.exercise.mechanic === "compound");
  const isolation = exs.filter((e) => e.exercise.mechanic !== "compound");
  const ordered = [...compounds, ...isolation];
  const changedOrder = ordered.some((e, i) => e.id !== exs[i]?.id);
  if (changedOrder) {
    await Promise.all(
      ordered.map((e, i) =>
        db.routineExercise.updateMany({ where: { id: e.id, routineId }, data: { position: i } }),
      ),
    );
    messages.push(
      "Reihenfolge optimiert: Grundübungen nach vorn, Isolation danach – so trainierst du die großen Übungen ausgeruht.",
    );
  }

  // 2) Fehlenden Gegenspieler ergänzen (nur wenn eine Seite ganz fehlt).
  const pushSets = exs
    .filter((e) => e.exercise.forceType === "push")
    .reduce((s, e) => s + (e.targetSets || 0), 0);
  const pullSets = exs
    .filter((e) => e.exercise.forceType === "pull")
    .reduce((s, e) => s + (e.targetSets || 0), 0);
  const present = new Set(exs.map((e) => e.exerciseId));

  const addBalancing = async (force: "push" | "pull", label: string) => {
    const candidate = await db.exercise.findFirst({
      where: {
        userId: user.id,
        mechanic: "compound",
        forceType: force,
        id: { notIn: [...present] },
      },
      orderBy: { nameDe: "asc" },
      select: { id: true, nameDe: true },
    });
    if (!candidate) return;
    const count = await db.routineExercise.count({ where: { routineId } });
    await db.routineExercise.create({
      data: { routineId, exerciseId: candidate.id, position: count, targetSets: 3, targetReps: 10 },
    });
    messages.push(
      `${label}-Übung ergänzt: „${candidate.nameDe}". Druck und Zug im Gleichgewicht beugt Dysbalancen und Schulterproblemen vor.`,
    );
  };

  if (pushSets >= 6 && pullSets === 0) await addBalancing("pull", "Zug");
  else if (pullSets >= 6 && pushSets === 0) await addBalancing("push", "Druck");

  if (messages.length === 0) {
    messages.push("Schon gut aufgebaut – Reihenfolge und Balance passen. Nichts zu ändern.");
  }

  revalidatePath(`/routines/${routineId}`);
  return { messages };
}
