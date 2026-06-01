"use server";

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
      for (let i = 0; i < re.targetSets; i++) {
        await db.workoutSet.create({
          data: {
            workoutExerciseId: we.id,
            setNumber: i + 1,
            reps: re.targetReps,
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

export async function finishWorkout(workoutId: string) {
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

  await db.workout.update({
    where: { id: workoutId },
    data: { finishedAt: new Date(), totalVolume },
  });

  revalidatePath("/history");
  revalidatePath("/");
  redirect(`/history/${workoutId}`);
}

export async function discardWorkout(workoutId: string) {
  const user = await requireUser();
  await db.workout.deleteMany({ where: { id: workoutId, userId: user.id } });
  revalidatePath("/");
  redirect("/");
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

    await db.routineExercise.create({
      data: {
        routineId: routine.id,
        exerciseId: we.exerciseId,
        position: we.position,
        targetSets: used.length,
        targetReps,
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
  data: { targetSets?: number; targetReps?: number; targetRestSec?: number },
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
