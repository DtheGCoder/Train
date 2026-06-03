-- Vorlagen-Metadaten für Filter & Coach-Empfehlung
ALTER TABLE "Routine" ADD COLUMN "goal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Routine" ADD COLUMN "level" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Routine" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Routine" ADD COLUMN "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Routine" ADD COLUMN "benefits" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Routine" ADD COLUMN "fromProgram" BOOLEAN NOT NULL DEFAULT false;

-- Mehrtägige Coach-Programme
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "cycles" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Program_userId_idx" ON "Program"("userId");

CREATE TABLE "ProgramDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "focus" TEXT NOT NULL DEFAULT '',
    "routineId" TEXT NOT NULL,
    CONSTRAINT "ProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProgramDay_programId_idx" ON "ProgramDay"("programId");
