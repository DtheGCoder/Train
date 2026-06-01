-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameDe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "primaryMuscleId" TEXT NOT NULL,
    "secondaryMuscles" TEXT NOT NULL DEFAULT '',
    "equipmentId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'strength',
    "mechanic" TEXT NOT NULL DEFAULT 'isolation',
    "forceType" TEXT NOT NULL DEFAULT 'push',
    "instructions" TEXT NOT NULL DEFAULT '',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Exercise_primaryMuscleId_fkey" FOREIGN KEY ("primaryMuscleId") REFERENCES "MuscleGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exercise_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Exercise" ("category", "createdAt", "equipmentId", "forceType", "id", "instructions", "isCustom", "mechanic", "nameDe", "nameEn", "primaryMuscleId", "secondaryMuscles") SELECT "category", "createdAt", "equipmentId", "forceType", "id", "instructions", "isCustom", "mechanic", "nameDe", "nameEn", "primaryMuscleId", "secondaryMuscles" FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
CREATE INDEX "Exercise_primaryMuscleId_idx" ON "Exercise"("primaryMuscleId");
CREATE INDEX "Exercise_userId_idx" ON "Exercise"("userId");
CREATE TABLE "new_PersonalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "userId" TEXT,
    "recordType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "achievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PersonalRecord" ("achievedAt", "exerciseId", "id", "recordType", "value") SELECT "achievedAt", "exerciseId", "id", "recordType", "value" FROM "PersonalRecord";
DROP TABLE "PersonalRecord";
ALTER TABLE "new_PersonalRecord" RENAME TO "PersonalRecord";
CREATE INDEX "PersonalRecord_exerciseId_recordType_idx" ON "PersonalRecord"("exerciseId", "recordType");
CREATE INDEX "PersonalRecord_userId_idx" ON "PersonalRecord"("userId");
CREATE TABLE "new_Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Routine" ("color", "createdAt", "description", "id", "isPreset", "name", "updatedAt") SELECT "color", "createdAt", "description", "id", "isPreset", "name", "updatedAt" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
CREATE INDEX "Routine_userId_idx" ON "Routine"("userId");
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "units" TEXT NOT NULL DEFAULT 'kg',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "goal" TEXT NOT NULL DEFAULT 'hypertrophy',
    "experience" TEXT NOT NULL DEFAULT 'intermediate',
    "coachStyle" TEXT NOT NULL DEFAULT 'balanced',
    "sex" TEXT NOT NULL DEFAULT '',
    "birthYear" INTEGER,
    "bodyweightKg" REAL,
    "heightCm" REAL,
    "trainingDaysPerWeek" INTEGER,
    "limitations" TEXT NOT NULL DEFAULT '',
    "availableEquipment" TEXT NOT NULL DEFAULT '',
    "preferredRepStyle" TEXT NOT NULL DEFAULT 'auto',
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("availableEquipment", "birthYear", "bodyweightKg", "coachStyle", "experience", "goal", "heightCm", "id", "limitations", "preferredRepStyle", "sex", "theme", "trainingDaysPerWeek", "units") SELECT "availableEquipment", "birthYear", "bodyweightKg", "coachStyle", "experience", "goal", "heightCm", "id", "limitations", "preferredRepStyle", "sex", "theme", "trainingDaysPerWeek", "units" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");
CREATE TABLE "new_Workout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Workout',
    "routineId" TEXT,
    "userId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "totalVolume" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Workout_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Workout" ("finishedAt", "id", "name", "notes", "routineId", "startedAt", "totalVolume") SELECT "finishedAt", "id", "name", "notes", "routineId", "startedAt", "totalVolume" FROM "Workout";
DROP TABLE "Workout";
ALTER TABLE "new_Workout" RENAME TO "Workout";
CREATE INDEX "Workout_startedAt_idx" ON "Workout"("startedAt");
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: bestehende (geteilte) Daten dem ersten/Admin-Nutzer zuweisen.
-- Der älteste Nutzer ist per Konvention der initiale Admin. Existiert kein
-- Nutzer, bleibt userId NULL (für where:{userId}-Queries unsichtbar -> kein Leak).
UPDATE "Exercise"       SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Routine"        SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Workout"        SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "PersonalRecord" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Settings"       SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
