-- Einzeln protokollierte Lebensmittel/Mahlzeiten mit Nährwerten
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kcal" REAL NOT NULL DEFAULT 0,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fat" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "NutritionEntry_userId_date_idx" ON "NutritionEntry"("userId", "date");
