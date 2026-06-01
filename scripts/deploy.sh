#!/usr/bin/env bash
# Erstinstallation / manuelles Deployment von Train auf einem Ubuntu-Server.
# Nutzung:  bash scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Train Deployment"

# 1) .env sicherstellen
if [ ! -f .env ]; then
  echo "Keine .env gefunden – kopiere .env.example. BITTE WERTE ANPASSEN!"
  cp .env.example .env
fi

# 2) Abhängigkeiten installieren (inkl. native better-sqlite3 Neukompilierung)
echo "==> npm ci"
npm ci

# 3) Prisma-Client erzeugen + Migrationen anwenden
echo "==> Prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

# 4) Datenbank seeden, falls noch keine Übungen/User existieren (idempotent)
echo "==> Seed (idempotent)"
npm run db:seed || echo "Seed übersprungen/fehlgeschlagen – fortfahren."

# 5) Produktionsbuild
echo "==> next build"
export GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || true)"
npm run build

# 6) Mit PM2 starten oder neu laden
mkdir -p logs
if pm2 describe train >/dev/null 2>&1; then
  echo "==> pm2 reload train"
  pm2 reload ecosystem.config.js --update-env
else
  echo "==> pm2 start train"
  pm2 start ecosystem.config.js --update-env
fi

pm2 save
echo "==> Fertig. Status: pm2 status"
