import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/password";
import { provisionTaxonomy, provisionUserContent } from "../src/lib/provision";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

// Legt einen initialen Admin-Account an, falls noch keiner existiert.
async function seedAdmin() {
  const count = await db.user.count();
  if (count > 0) {
    console.log(`Skipping admin seed (${count} user(s) already exist).`);
    return;
  }
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "train1234";
  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { username, passwordHash, isAdmin: true } });
  console.log(
    `Created admin user "${username}".` +
      (process.env.ADMIN_PASSWORD
        ? ""
        : ` Default password "${password}" – BITTE NACH DEM ERSTEN LOGIN ÄNDERN!`),
  );
}

// Setzt den Anzeigenamen des Admin-Accounts auf "DtheG" (Login bleibt "admin").
// Idempotent & nicht-destruktiv: nur, solange noch kein Anzeigename gesetzt ist,
// damit eine spätere manuelle Änderung erhalten bleibt.
async function ensureAdminDisplayName() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const res = await db.user.updateMany({
    where: { username, displayName: null },
    data: { displayName: "DtheG" },
  });
  if (res.count > 0) {
    console.log(`Set display name "DtheG" for login "${username}".`);
  }
}

async function main() {
  console.log("Seeding globale Taxonomie (Muskeln & Equipment)...");
  await provisionTaxonomy(db);

  await seedAdmin();
  await ensureAdminDisplayName();

  // Jeder Nutzer bekommt seinen eigenen Übungskatalog, Vorlagen & Einstellungen.
  const users = await db.user.findMany({ select: { id: true, username: true } });
  for (const u of users) {
    console.log(`Provisioniere Inhalte für "${u.username}"...`);
    await provisionUserContent(db, u.id);
  }

  console.log(`Done. ${users.length} Nutzer provisioniert.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
