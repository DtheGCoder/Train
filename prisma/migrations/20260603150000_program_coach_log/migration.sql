-- Coach-Anpassungen: Protokoll automatischer Änderungen + Deload-Tracking
ALTER TABLE "Program" ADD COLUMN "coachLogJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Program" ADD COLUMN "lastDeloadCycle" INTEGER NOT NULL DEFAULT 0;
