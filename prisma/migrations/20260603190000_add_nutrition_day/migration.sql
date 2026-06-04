-- Ernährungs-Tagesprotokoll
CREATE TABLE "NutritionDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "checkedJson" TEXT NOT NULL DEFAULT '[]',
    "extraKcal" REAL NOT NULL DEFAULT 0,
    "extraProtein" REAL NOT NULL DEFAULT 0,
    "extraCarbs" REAL NOT NULL DEFAULT 0,
    "extraFat" REAL NOT NULL DEFAULT 0,
    "waterMl" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NutritionDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NutritionDay_userId_date_key" ON "NutritionDay"("userId", "date");
CREATE INDEX "NutritionDay_userId_idx" ON "NutritionDay"("userId");
