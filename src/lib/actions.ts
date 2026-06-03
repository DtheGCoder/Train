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
import { getProgram } from "@/lib/program-data";
import { loadCoachProfile } from "@/lib/coach-data";
import {
  decideExercise,
  decideDeload,
  DELOAD_FACTOR,
  type CoachLogKind,
} from "@/lib/coach-program";
import {
  e1rmRpe,
  repRange,
  analyzeExerciseHistory,
  roundToIncrement,
} from "@/lib/coach";
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

  // Gehört das Workout zu einem aktiven Coach-Programm? Dann Cursor weiterschalten
  // und die Tages-Routine wie ein echter Coach anpassen.
  await advanceProgramAfterWorkout(workout.routineId, user.id);

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

// Eine Plan-Übung gegen eine andere austauschen. Position, Sätze und Pause
// bleiben erhalten (z. B. Langhantel- gegen Kurzhantel-Bankdrücken bei 3×10).
export async function replaceRoutineExercise(
  id: string,
  routineId: string,
  newExerciseId: string,
) {
  const user = await requireUser();
  // Beide gehören dem Nutzer (Vorlage + Zielübung)?
  const [re, ex] = await Promise.all([
    db.routineExercise.findFirst({
      where: { id, routine: { userId: user.id } },
      select: { id: true },
    }),
    db.exercise.findFirst({
      where: { id: newExerciseId, userId: user.id },
      select: { id: true },
    }),
  ]);
  if (!re || !ex) return;
  await db.routineExercise.update({
    where: { id },
    data: { exerciseId: newExerciseId },
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

/* ---------------- Coach-Programme (mehrtägige Pläne) ---------------- */

const PROGRAM_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
];

// Aktiviert ein kuratiertes Programm: erzeugt pro Tag eine Routine und legt das
// Programm mit seinen Tagen an. Ein zuvor aktives Programm wird ersetzt.
export async function activateProgram(
  key: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const seed = getProgram(key);
  if (!seed) return { ok: false };

  // Bisher aktive Programme + deren erzeugte Routinen entfernen.
  const old = await db.program.findMany({
    where: { userId: user.id, active: true },
    include: { days: true },
  });
  for (const prog of old) {
    const rids = prog.days.map((d) => d.routineId);
    await db.program.delete({ where: { id: prog.id } });
    if (rids.length) {
      await db.routine.deleteMany({
        where: { id: { in: rids }, userId: user.id },
      });
    }
  }

  // Name -> Übungs-ID des Nutzers.
  const exs = await db.exercise.findMany({
    where: { userId: user.id },
    select: { id: true, nameDe: true },
  });
  const byName = new Map(exs.map((e) => [e.nameDe, e.id]));

  const program = await db.program.create({
    data: {
      userId: user.id,
      key: seed.key,
      name: seed.name,
      description: seed.description,
      goal: seed.goal,
      level: seed.level,
      location: seed.location,
      daysPerWeek: seed.daysPerWeek,
    },
  });

  let pos = 0;
  for (const day of seed.days) {
    const routine = await db.routine.create({
      data: {
        name: `${seed.name} · ${day.label}`,
        description: day.focus,
        color: PROGRAM_COLORS[pos % PROGRAM_COLORS.length],
        userId: user.id,
        fromProgram: true,
        goal: seed.goal,
        level: seed.level,
        location: seed.location,
        category: seed.name,
        benefits: day.focus,
      },
    });
    let p2 = 0;
    for (const [exName, sets, reps] of day.exercises) {
      const exId = byName.get(exName);
      if (!exId) continue;
      await db.routineExercise.create({
        data: {
          routineId: routine.id,
          exerciseId: exId,
          position: p2++,
          targetSets: sets,
          targetReps: reps,
          targetRestSec: seed.rest ?? 90,
        },
      });
    }
    await db.programDay.create({
      data: {
        programId: program.id,
        position: pos++,
        label: day.label,
        focus: day.focus,
        routineId: routine.id,
      },
    });
  }

  revalidatePath("/routines");
  revalidatePath("/");
  return { ok: true };
}

// Beendet ein Programm und entfernt seine erzeugten Tages-Routinen. Bereits
// absolvierte Workouts bleiben im Verlauf erhalten.
export async function deactivateProgram(programId: string) {
  const user = await requireUser();
  const prog = await db.program.findFirst({
    where: { id: programId, userId: user.id },
    include: { days: true },
  });
  if (!prog) return;
  const rids = prog.days.map((d) => d.routineId);
  await db.program.delete({ where: { id: prog.id } });
  if (rids.length) {
    await db.routine.deleteMany({
      where: { id: { in: rids }, userId: user.id },
    });
  }
  revalidatePath("/routines");
  revalidatePath("/");
}

// Nach einem Programm-Workout: Cursor auf den nächsten Tag setzen und die
// Tages-Routine leicht progressiv anpassen (Double Progression).
type CoachLogEntry = {
  at: string;
  day: string;
  kind: CoachLogKind | "deload" | "note";
  text: string;
};

function parseCoachLog(json: string): CoachLogEntry[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as CoachLogEntry[]) : [];
  } catch {
    return [];
  }
}

// Kern der Selbstanpassung: nach jedem Programm-Workout wertet der Coach den
// Verlauf jeder Übung aus und passt die Tages-Routine an (steigern, halten,
// entlasten, tauschen). Am Durchlauf-Ende wird ggf. ein Deload eingelegt.
async function advanceProgramAfterWorkout(
  routineId: string | null,
  userId: string,
) {
  if (!routineId) return;
  const day = await db.programDay.findFirst({
    where: { routineId, program: { userId, active: true } },
    include: {
      program: {
        select: {
          id: true,
          cursor: true,
          cycles: true,
          lastDeloadCycle: true,
          coachLogJson: true,
          days: { select: { routineId: true } },
        },
      },
    },
  });
  if (!day) return;
  const program = day.program;
  const len = program.days.length;
  const profile = await loadCoachProfile();
  const { low } = repRange(profile);

  // Übungen der Tages-Routine + die letzten beendeten Einheiten dieser Routine.
  const [res, past] = await Promise.all([
    db.routineExercise.findMany({
      where: { routineId },
      orderBy: { position: "asc" },
      include: {
        exercise: {
          select: {
            id: true,
            nameDe: true,
            mechanic: true,
            primaryMuscleId: true,
            equipmentId: true,
          },
        },
      },
    }),
    db.workout.findMany({
      where: { userId, routineId, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 8,
      select: {
        finishedAt: true,
        exercises: {
          select: {
            exerciseId: true,
            sets: {
              select: {
                weight: true,
                reps: true,
                rpe: true,
                isCompleted: true,
                setType: true,
              },
            },
          },
        },
      },
    }),
  ]);
  const chrono = past.slice().reverse(); // alt -> neu (aktuelle Einheit zuletzt)
  const presentIds = new Set(res.map((r) => r.exerciseId));
  const log: CoachLogEntry[] = [];
  const now = new Date().toISOString();
  let fatigueCount = 0;
  let considered = 0;

  for (const re of res) {
    // Verlaufs-Sessions dieser Übung aufbauen.
    const sessions = [];
    for (const w of chrono) {
      const we = w.exercises.find((e) => e.exerciseId === re.exerciseId);
      if (!we) continue;
      const working = we.sets.filter(
        (s) =>
          s.isCompleted && s.setType !== "warmup" && (s.weight > 0 || s.reps > 0),
      );
      if (working.length === 0) continue;
      const topWeight = Math.max(0, ...working.map((s) => s.weight));
      const topSet =
        working
          .filter((s) => s.weight === topWeight)
          .sort((a, b) => b.reps - a.reps)[0] ?? working[0];
      const bestE = Math.max(
        0,
        ...working.map((s) => e1rmRpe(s.weight, s.reps, s.rpe)),
      );
      sessions.push({
        date: w.finishedAt!.toISOString(),
        bestE1RM: bestE,
        topWeight,
        topReps: topSet.reps,
        workSets: working.length,
      });
    }
    if (sessions.length === 0) continue;

    // Aktuelle (gerade beendete) Einheit = letzte mit dieser Übung.
    const curW = chrono[chrono.length - 1];
    const curWe = curW.exercises.find((e) => e.exerciseId === re.exerciseId);
    const curWorking =
      curWe?.sets.filter(
        (s) =>
          s.isCompleted && s.setType !== "warmup" && (s.weight > 0 || s.reps > 0),
      ) ?? [];
    if (curWorking.length === 0) continue;
    considered++;

    const curTop = Math.max(0, ...curWorking.map((s) => s.weight));
    const rpes = curWorking
      .map((s) => s.rpe)
      .filter((r): r is number => r != null);
    const avgRpe = rpes.length
      ? rpes.reduce((a, b) => a + b, 0) / rpes.length
      : null;
    const hitTarget = curWorking.every((s) => s.reps >= re.targetReps);

    if (analyzeExerciseHistory({ sessions }).needsDeload) fatigueCount++;

    const decision = decideExercise(
      {
        routineExerciseId: re.id,
        exerciseId: re.exerciseId,
        name: re.exercise.nameDe,
        mechanic: re.exercise.mechanic,
        targetReps: re.targetReps,
        history: { sessions },
      },
      { topWeight: curTop, avgRpe, hitTarget },
      profile,
    );

    const setCount = curWorking.length;
    const a = decision.action;

    if (a.kind === "swap") {
      // Frische Variante für denselben Muskel finden (gleicher Mechanik-Typ,
      // möglichst gleiches Equipment), die noch nicht im Plan ist.
      const candidate =
        (await db.exercise.findFirst({
          where: {
            userId,
            primaryMuscleId: re.exercise.primaryMuscleId,
            mechanic: re.exercise.mechanic,
            equipmentId: re.exercise.equipmentId ?? undefined,
            id: { notIn: [...presentIds] },
          },
          orderBy: { nameDe: "asc" },
          select: { id: true, nameDe: true },
        })) ??
        (await db.exercise.findFirst({
          where: {
            userId,
            primaryMuscleId: re.exercise.primaryMuscleId,
            id: { notIn: [...presentIds] },
          },
          orderBy: { nameDe: "asc" },
          select: { id: true, nameDe: true },
        }));
      if (candidate) {
        presentIds.delete(re.exerciseId);
        presentIds.add(candidate.id);
        await db.routineExercise.update({
          where: { id: re.id },
          data: {
            exerciseId: candidate.id,
            setsJson: "",
            targetWeight: 0,
            targetReps: low,
          },
        });
        log.push({
          at: now,
          day: day.label,
          kind: "swap",
          text: `${re.exercise.nameDe} → „${candidate.nameDe}": ${decision.message.replace(/^[^:]*:\s*/, "")}`,
        });
      } else {
        log.push({
          at: now,
          day: day.label,
          kind: "hold",
          text: `${re.exercise.nameDe}: Plateau, aber keine passende Alternative im Katalog – Gewicht gehalten.`,
        });
      }
      continue;
    }

    // Gewicht/Wdh anwenden (gleichförmige Sätze als neue Vorgabe).
    const perSet: RoutineSet[] = Array.from({ length: setCount }, () => ({
      reps: a.reps,
      weight: a.weight,
    }));
    await db.routineExercise.update({
      where: { id: re.id },
      data: {
        setsJson: JSON.stringify(perSet),
        targetSets: setCount,
        targetReps: a.reps,
        targetWeight: a.weight,
      },
    });
    log.push({ at: now, day: day.label, kind: decision.logKind, text: decision.message });
  }

  // Cursor weiter + Durchlauf zählen.
  const wrapped = day.position + 1 >= len;
  const newCycles = wrapped ? program.cycles + 1 : program.cycles;
  let lastDeloadCycle = program.lastDeloadCycle;

  // Am Durchlauf-Ende: Deload prüfen und ggf. alle Tages-Routinen entlasten.
  if (wrapped) {
    const fatigueShare = considered > 0 ? fatigueCount / considered : 0;
    const dl = decideDeload({
      cyclesDone: newCycles,
      lastDeloadCycle: program.lastDeloadCycle,
      fatigueShare,
    });
    if (dl.deload) {
      lastDeloadCycle = newCycles;
      const dayRoutineIds = program.days.map((d) => d.routineId);
      const allRe = await db.routineExercise.findMany({
        where: { routineId: { in: dayRoutineIds } },
        select: { id: true, targetWeight: true, setsJson: true, targetReps: true, targetSets: true },
      });
      for (const re of allRe) {
        if (re.targetWeight <= 0) continue; // Körpergewicht nicht „entlasten"
        const newW = roundToIncrement(re.targetWeight * DELOAD_FACTOR, 1.25);
        let setsJson = re.setsJson;
        try {
          const arr = JSON.parse(re.setsJson || "[]") as RoutineSet[];
          if (Array.isArray(arr) && arr.length > 0) {
            setsJson = JSON.stringify(
              arr.map((s) => ({
                reps: s.reps,
                weight:
                  s.weight > 0
                    ? roundToIncrement(s.weight * DELOAD_FACTOR, 1.25)
                    : 0,
              })),
            );
          }
        } catch {
          /* setsJson bleibt unverändert */
        }
        await db.routineExercise.update({
          where: { id: re.id },
          data: { targetWeight: newW, setsJson },
        });
      }
      log.push({ at: now, day: "Programm", kind: "deload", text: dl.reason });
    }
  }

  const merged = [...log, ...parseCoachLog(program.coachLogJson)].slice(0, 40);
  await db.program.update({
    where: { id: program.id },
    data: {
      cursor: (day.position + 1) % len,
      cycles: newCycles,
      lastDeloadCycle,
      coachLogJson: JSON.stringify(merged),
    },
  });
}

// Coach bewertet das laufende Programm anhand der echten Trainingsdaten und gibt
// wissenschaftlich begründete Hinweise (Konsistenz, Erholung, Deload).
export async function reviewProgram(
  programId: string,
): Promise<{ messages: string[] }> {
  const user = await requireUser();
  const prog = await db.program.findFirst({
    where: { id: programId, userId: user.id },
    include: { days: true },
  });
  if (!prog) return { messages: [] };
  const profile = await loadCoachProfile();

  const routineIds = prog.days.map((d) => d.routineId);
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const recent = await db.workout.findMany({
    where: {
      userId: user.id,
      routineId: { in: routineIds },
      finishedAt: { gte: since, not: null },
    },
    select: { finishedAt: true, totalVolume: true },
    orderBy: { finishedAt: "asc" },
  });

  const messages: string[] = [];
  const perWeek = recent.length / 4;
  const target = prog.daysPerWeek;

  if (recent.length === 0) {
    messages.push(
      "Noch keine abgeschlossenen Einheiten in diesem Plan. Starte mit dem nächsten Tag – nach ein paar Workouts bewerte ich deinen Fortschritt konkret.",
    );
  } else {
    if (perWeek >= target - 0.25) {
      messages.push(
        `Top-Konsistenz: ~${perWeek.toFixed(1)} Einheiten/Woche – genau im Plan (${target}/Woche). Weiter so, Regelmäßigkeit ist der größte Hebel.`,
      );
    } else if (perWeek >= target * 0.6) {
      messages.push(
        `~${perWeek.toFixed(1)} Einheiten/Woche, angepeilt sind ${target}. Versuch, eine Einheit mehr unterzubringen – sonst stockt der Fortschritt.`,
      );
    } else {
      messages.push(
        `Nur ~${perWeek.toFixed(1)} Einheiten/Woche statt ${target}. Vielleicht ist ein Plan mit weniger Tagen realistischer – Dranbleiben schlägt das perfekte Programm.`,
      );
    }

    // Volumen-Trend (erste vs. letzte Hälfte)
    if (recent.length >= 4) {
      const half = Math.floor(recent.length / 2);
      const avg = (arr: typeof recent) =>
        arr.reduce((s, w) => s + w.totalVolume, 0) / (arr.length || 1);
      const first = avg(recent.slice(0, half));
      const last = avg(recent.slice(half));
      if (last > first * 1.05) {
        messages.push(
          "Dein Volumen steigt stetig – die progressive Belastung greift. Genau so soll es laufen.",
        );
      } else if (last < first * 0.95) {
        messages.push(
          "Dein Volumen geht zurück. Das kann auf Ermüdung hindeuten – plane eine leichtere Woche (Deload) mit ~60 % der Sätze ein.",
        );
      }
    }
  }

  // Deload-Empfehlung nach mehreren Durchläufen
  if (prog.cycles >= 4) {
    messages.push(
      `Du hast ${prog.cycles} Durchläufe geschafft. Nach 4–6 Wochen harter Arbeit ist eine Deload-Woche sinnvoll (leichtere Gewichte/weniger Sätze), damit Körper und Gelenke sich erholen.`,
    );
  }

  // Niveau-Hinweis: passt der Split noch zum Level?
  if (profile.experience === "advanced" && prog.daysPerWeek <= 3) {
    messages.push(
      "Als Erfahrener könntest du mit mehr Volumen (4–6 Tage) noch mehr herausholen – wenn die Erholung mitspielt.",
    );
  }

  revalidatePath("/routines");
  return { messages };
}
