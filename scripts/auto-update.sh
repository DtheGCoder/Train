#!/usr/bin/env bash
# Voll-automatisches Update: prüft GitHub auf neue Commits und führt bei
# Änderung pull -> install -> migrate -> build -> pm2 reload aus.
# Wird per cron/systemd-Timer regelmäßig aufgerufen.
#
# cron-Beispiel (alle 5 Minuten):
#   */5 * * * * /usr/bin/flock -n /tmp/train-update.lock /var/www/train/scripts/auto-update.sh >> /var/www/train/logs/auto-update.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"

echo "[$(date -Is)] Prüfe auf Updates (Branch: $BRANCH)…"

git fetch --quiet origin "$BRANCH"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[$(date -Is)] Bereits aktuell ($LOCAL). Nichts zu tun."
  exit 0
fi

echo "[$(date -Is)] Update gefunden: $LOCAL -> $REMOTE. Aktualisiere…"

# Sauberer Stand: lokale Änderungen verwerfen, auf Remote setzen.
git reset --hard "origin/$BRANCH"

echo "[$(date -Is)] npm ci"
npm ci

echo "[$(date -Is)] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "[$(date -Is)] build"
export GIT_COMMIT="$(git rev-parse HEAD)"
npm run build

echo "[$(date -Is)] pm2 reload"
mkdir -p logs
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "[$(date -Is)] Update abgeschlossen auf $REMOTE."
