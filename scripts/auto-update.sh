#!/usr/bin/env bash
# Voll-automatisches Update: prüft GitHub auf neue Commits und führt bei
# Änderung pull -> install -> migrate -> build -> pm2 reload aus.
# Wird per cron/systemd-Timer regelmäßig aufgerufen.
#
# Einrichtung am einfachsten via:  bash scripts/install-autoupdate.sh
#
# cron-Beispiel (alle 5 Minuten) – das Skript loggt selbst, daher KEINE
# Umleitung nötig (die scheitert sonst, wenn logs/ noch nicht existiert):
#   */5 * * * * /usr/bin/flock -n /tmp/train-update.lock /var/www/train/scripts/auto-update.sh
set -euo pipefail

# --- In das Projektverzeichnis wechseln ---------------------------------------
cd "$(dirname "$0")/.."
PROJECT_DIR="$PWD"

# --- Logging robust machen ----------------------------------------------------
# Eigenes Log immer schreiben (auch wenn cron keine Umleitung mitgibt). So
# sieht man IMMER, ob das Skript lief und woran es ggf. scheiterte.
mkdir -p "$PROJECT_DIR/logs"
exec >> "$PROJECT_DIR/logs/auto-update.log" 2>&1

# --- PATH für cron/systemd absichern ------------------------------------------
# cron startet mit minimalem PATH (/usr/bin:/bin) und kennt npm/npx/pm2 oft
# nicht – vor allem bei Node via nvm. Daher PATH erweitern + nvm laden.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export HOME="${HOME:-$(getent passwd "$(id -u)" | cut -d: -f6)}"

# nvm laden, falls vorhanden (häufigste Ursache für "command not found").
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi
# Pfad eines evtl. per nvm aktiven node ins PATH aufnehmen.
if command -v node >/dev/null 2>&1; then
  PATH="$(dirname "$(command -v node)"):$PATH"
  export PATH
fi

# Frühzeitig prüfen, ob die Toolchain auffindbar ist – sonst klare Meldung.
for bin in git npm npx pm2; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[$(date -Is)] FEHLER: '$bin' nicht im PATH gefunden. PATH=$PATH"
    echo "[$(date -Is)] Tipp: Node via nvm? Dann läuft cron evtl. als anderer User."
    exit 127
  fi
done

# --- git: "dubious ownership" verhindern --------------------------------------
# Wenn das Repo als root geklont wurde, der Update-Prozess aber als anderer
# User läuft, lehnt git sonst alle Operationen ab.
git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

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

# .env in die Umgebung laden (DATABASE_URL & ADMIN_PASSWORD für Seed/Prisma).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# WICHTIG: --include=dev erzwingt devDependencies. Die .env oben setzt
# NODE_ENV=production; ohne das Flag ließe npm ci tsx, tailwind &
# @tailwindcss/postcss weg -> Seed (tsx) und next build (postcss) schlagen fehl.
echo "[$(date -Is)] npm ci (inkl. devDependencies für Build/Seed)"
npm ci --include=dev

echo "[$(date -Is)] prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

# Seed idempotent nachziehen (legt fehlende Übungen/Presets/Admin in der
# RICHTIGEN DB an; überspringt vorhandene Daten).
echo "[$(date -Is)] db:seed (idempotent)"
npm run db:seed || echo "[$(date -Is)] Seed übersprungen/fehlgeschlagen – fortfahren."

echo "[$(date -Is)] build"
export GIT_COMMIT="$(git rev-parse HEAD)"
npm run build

echo "[$(date -Is)] pm2 reload"
pm2 reload ecosystem.config.js --update-env
pm2 save

echo "[$(date -Is)] Update abgeschlossen auf $REMOTE."
