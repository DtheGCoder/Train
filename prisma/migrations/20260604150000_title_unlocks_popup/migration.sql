-- Neu freigeschaltete Titel: Snapshot in Settings + pro Workout vermerken
ALTER TABLE "Settings" ADD COLUMN "titlesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Workout" ADD COLUMN "unlockedTitlesJson" TEXT NOT NULL DEFAULT '[]';
