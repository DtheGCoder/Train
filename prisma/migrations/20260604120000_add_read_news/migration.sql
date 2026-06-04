-- Gelesene Neuigkeiten (Postfach)
ALTER TABLE "Settings" ADD COLUMN "readNewsJson" TEXT NOT NULL DEFAULT '[]';
