-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
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
    "preferredRepStyle" TEXT NOT NULL DEFAULT 'auto'
);
INSERT INTO "new_Settings" ("birthYear", "bodyweightKg", "coachStyle", "experience", "goal", "heightCm", "id", "sex", "theme", "units") SELECT "birthYear", "bodyweightKg", "coachStyle", "experience", "goal", "heightCm", "id", "sex", "theme", "units" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
