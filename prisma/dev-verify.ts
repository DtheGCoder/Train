import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { epley1RM } from "../src/lib/utils";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

async function ex(nameDe: string) {
  const e = await db.exercise.findFirst({ where: { nameDe } });
  if (!e) throw new Error(`Exercise not found: ${nameDe}`);
  return e;
}

async function main() {
  // --- Routine ---
  const routine = await db.routine.create({
    data: { name: "Push Day", description: "Brust/Schulter/Trizeps" },
  });
  const pushEx = [
    await ex("Bankdrücken (Langhantel)"),
    await ex("Schulterdrücken (Kurzhantel)"),
    await ex("Trizepsdrücken am Seil"),
  ];
  for (let i = 0; i < pushEx.length; i++) {
    await db.routineExercise.create({
      data: {
        routineId: routine.id,
        exerciseId: pushEx[i].id,
        position: i,
        targetSets: 3,
        targetReps: 10,
        targetRestSec: 90,
      },
    });
  }

  // --- Aktives Workout ---
  const active = await db.workout.create({ data: { name: "Freies Workout" } });
  const bench = await ex("Bankdrücken (Langhantel)");
  const aWe = await db.workoutExercise.create({
    data: { workoutId: active.id, exerciseId: bench.id, position: 0 },
  });
  for (let i = 0; i < 3; i++) {
    await db.workoutSet.create({
      data: { workoutExerciseId: aWe.id, setNumber: i + 1, weight: 60, reps: 10 },
    });
  }

  // --- Abgeschlossenes Workout (mit Verlauf) ---
  const done = await db.workout.create({
    data: {
      name: "Pull Day",
      startedAt: new Date(Date.now() - 3 * 86400_000),
    },
  });
  const rows = await ex("Langhantelrudern");
  const curl = await ex("Bizeps Curls (Kurzhantel)");
  let volume = 0;
  for (const e of [rows, curl]) {
    const we = await db.workoutExercise.create({
      data: { workoutId: done.id, exerciseId: e.id, position: 0 },
    });
    for (let i = 0; i < 3; i++) {
      const weight = e.id === rows.id ? 70 : 16;
      const reps = 10 - i;
      await db.workoutSet.create({
        data: {
          workoutExerciseId: we.id,
          setNumber: i + 1,
          weight,
          reps,
          isCompleted: true,
        },
      });
      volume += weight * reps;
    }
    // PRs
    const best1rm = epley1RM(e.id === rows.id ? 70 : 16, 10);
    await db.personalRecord.create({
      data: { exerciseId: e.id, recordType: "1rm", value: best1rm },
    });
  }
  await db.workout.update({
    where: { id: done.id },
    data: {
      finishedAt: new Date(Date.now() - 3 * 86400_000 + 3600_000),
      totalVolume: volume,
    },
  });

  console.log("ROUTINE_ID=" + routine.id);
  console.log("ACTIVE_WORKOUT_ID=" + active.id);
  console.log("DONE_WORKOUT_ID=" + done.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
