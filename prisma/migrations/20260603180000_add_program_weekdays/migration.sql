-- Trainingstage der Woche pro Coach-Programm (CSV, ISO 1=Mo … 7=So)
ALTER TABLE "Program" ADD COLUMN "weekdays" TEXT NOT NULL DEFAULT '';
