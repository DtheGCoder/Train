-- Achievements-Snapshot + ausgerüsteter Titel + Workout-Unlocks
ALTER TABLE "Settings" ADD COLUMN "achievementsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "equippedTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workout" ADD COLUMN "unlockedJson" TEXT NOT NULL DEFAULT '[]';
