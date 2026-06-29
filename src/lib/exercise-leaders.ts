import { db } from "@/lib/db";

// Top-Lifter je Übung über ALLE Nutzer – „wer bewegt hier am meisten kg".
// Übungen gehören pro Nutzer einem eigenen Katalog (eigene id), daher wird
// übergreifend über den (kanonischen) englischen Namen zusammengeführt.

export type TopLifter = {
  name: string;
  avatar: string | null;
  kg: number; // schwerstes Arbeitsgewicht des Nutzers in dieser Übung
  reps: number; // Wdh dieses Satzes (bzw. Wdh-Bestwert bei Körpergewicht)
};

// Kanonischer, übergreifender Schlüssel einer Übung (Name normalisiert).
export function exerciseKey(nameEn: string): string {
  return nameEn.trim().toLowerCase();
}

export async function topLiftersByExercise(): Promise<Record<string, TopLifter[]>> {
  const [workouts, users] = await Promise.all([
    db.workout.findMany({
      where: { finishedAt: { not: null } },
      select: {
        userId: true,
        exercises: {
          select: {
            exercise: { select: { nameEn: true } },
            sets: {
              select: {
                weight: true,
                reps: true,
                isCompleted: true,
                setType: true,
              },
            },
          },
        },
      },
    }),
    db.user.findMany({
      select: { id: true, username: true, displayName: true, avatar: true },
    }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  // exerciseKey -> userId -> Bestwerte des Nutzers in dieser Übung
  type Acc = { maxKg: number; repsAtMax: number; maxReps: number };
  const byEx = new Map<string, Map<string, Acc>>();

  for (const w of workouts) {
    if (!w.userId) continue;
    for (const e of w.exercises) {
      const key = exerciseKey(e.exercise.nameEn);
      let perUser = byEx.get(key);
      if (!perUser) {
        perUser = new Map();
        byEx.set(key, perUser);
      }
      let acc = perUser.get(w.userId);
      if (!acc) {
        acc = { maxKg: 0, repsAtMax: 0, maxReps: 0 };
        perUser.set(w.userId, acc);
      }
      for (const s of e.sets) {
        if (!s.isCompleted || s.setType === "warmup") continue;
        if (
          s.weight > acc.maxKg ||
          (s.weight === acc.maxKg && s.reps > acc.repsAtMax)
        ) {
          acc.maxKg = s.weight;
          acc.repsAtMax = s.reps;
        }
        if (s.reps > acc.maxReps) acc.maxReps = s.reps;
      }
    }
  }

  const out: Record<string, TopLifter[]> = {};
  for (const [key, perUser] of byEx) {
    // Übung mit Gewicht? Sonst (Körpergewicht) nach Wdh ranken.
    const weighted = [...perUser.values()].some((a) => a.maxKg > 0);
    const entries: TopLifter[] = [...perUser.entries()]
      .map(([uid, a]) => {
        const u = userMap.get(uid);
        const name = u?.displayName?.trim() || u?.username || "Athlet";
        return weighted
          ? { name, avatar: u?.avatar ?? null, kg: a.maxKg, reps: a.repsAtMax }
          : { name, avatar: u?.avatar ?? null, kg: 0, reps: a.maxReps };
      })
      .filter((e) => (weighted ? e.kg > 0 : e.reps > 0))
      .sort((a, b) =>
        weighted ? b.kg - a.kg || b.reps - a.reps : b.reps - a.reps,
      )
      .slice(0, 3);
    if (entries.length > 0) out[key] = entries;
  }
  return out;
}
