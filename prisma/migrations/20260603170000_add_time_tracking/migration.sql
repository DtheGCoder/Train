-- Zeit-basierte Übungen (Plank, Wandsitz, Cardio) + Satz-Dauer
ALTER TABLE "Exercise" ADD COLUMN "trackingType" TEXT NOT NULL DEFAULT 'reps';
ALTER TABLE "WorkoutSet" ADD COLUMN "durationSec" INTEGER NOT NULL DEFAULT 0;
