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

# --- Nur EIN Update gleichzeitig ----------------------------------------------
# Verhindert, dass manueller Trigger (Admin-Seite) und Timer parallel laufen.
# Wer den Lock nicht bekommt, beendet sich ruhig (kein Fehler).
exec 9>"$PROJECT_DIR/logs/update.lock"
if command -v flock >/dev/null 2>&1 && ! flock -n 9; then
  echo "[$(date -Is)] Ein Update läuft bereits (Lock belegt). Abbruch."
  exit 0
fi

# --- Fortschritts-Status für die Admin-Seite ----------------------------------
# Wird als JSON nach logs/update-status.json geschrieben. Liegt bewusst auf der
# Platte, damit das UI den Fortschritt auch über den pm2-Neustart hinweg sieht.
STATUS_FILE="$PROJECT_DIR/logs/update-status.json"
# startedAt erhalten, falls die Admin-Action den Lauf schon angemeldet hat –
# so läuft die "läuft seit"-Uhr im UI ohne Sprung weiter.
EXISTING_STARTED="$(grep -o '"startedAt"[[:space:]]*:[[:space:]]*"[^"]*"' "$STATUS_FILE" 2>/dev/null | head -1 | sed -E 's/.*"([^"]*)"$/\1/')"
STARTED_AT="${EXISTING_STARTED:-$(date -Is)}"
FROM_SHA=""
TO_SHA=""
CURRENT_STEP="start"
CURRENT_MSG="Update wird vorbereitet…"

write_status() {
  # $1=state  $2=step  $3=message  $4=error(optional)
  local state="$1" step="$2" msg="$3" err="${4:-}"
  local tmp="$STATUS_FILE.tmp.$$"
  {
    printf '{\n'
    printf '  "state": "%s",\n' "$state"
    printf '  "step": "%s",\n' "$step"
    printf '  "startedAt": "%s",\n' "$STARTED_AT"
    printf '  "updatedAt": "%s",\n' "$(date -Is)"
    printf '  "fromSha": "%s",\n' "$FROM_SHA"
    printf '  "toSha": "%s",\n' "$TO_SHA"
    printf '  "message": "%s",\n' "$msg"
    printf '  "error": "%s"\n' "$err"
    printf '}\n'
  } > "$tmp" 2>/dev/null || return 0
  mv -f "$tmp" "$STATUS_FILE" 2>/dev/null || true
}

# Schritt anmelden: Status auf "running" setzen + ins Log schreiben.
phase() {
  CURRENT_STEP="$1"
  CURRENT_MSG="$2"
  write_status running "$1" "$2"
  echo "[$(date -Is)] $2"
}

# Bei jedem Abbruch (set -e) den Fehlerstatus festhalten, damit das UI den
# Button wieder anbietet statt ewig "läuft" anzuzeigen.
trap 'write_status error "$CURRENT_STEP" "$CURRENT_MSG" "Update fehlgeschlagen in Schritt: $CURRENT_MSG (Details in logs/auto-update.log)"' ERR

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

FROM_SHA="$LOCAL"
TO_SHA="$REMOTE"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[$(date -Is)] Bereits aktuell ($LOCAL). Nichts zu tun."
  # Falls die Admin-Action einen Lauf angemeldet hatte (Status "running"),
  # bevor in der Zwischenzeit schon aktualisiert wurde: sauber auf Erfolg
  # setzen, damit die Anzeige nicht hängen bleibt. Routineläufe (kein
  # "running") lassen den Status unangetastet.
  if grep -q '"state"[[:space:]]*:[[:space:]]*"running"' "$STATUS_FILE" 2>/dev/null; then
    write_status success done "Bereits aktuell – keine Änderungen nötig."
  fi
  exit 0
fi

echo "[$(date -Is)] Update gefunden: $LOCAL -> $REMOTE. Aktualisiere…"

# Sauberer Stand: lokale Änderungen verwerfen, auf Remote setzen.
phase pull "Code von GitHub holen"
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
phase install "Abhängigkeiten installieren"
npm ci --include=dev

phase migrate "Datenbank migrieren"
npx prisma generate
npx prisma migrate deploy

# Seed idempotent nachziehen (legt fehlende Übungen/Presets/Admin in der
# RICHTIGEN DB an; überspringt vorhandene Daten).
phase seed "Daten aktualisieren"
npm run db:seed || echo "[$(date -Is)] Seed übersprungen/fehlgeschlagen – fortfahren."

phase build "App neu bauen"
export GIT_COMMIT="$(git rev-parse HEAD)"
npm run build

# Letzter Schritt: pm2 reload startet DIESEN Server neu. Dieses Skript läuft
# als eigener (losgelöster) Prozess weiter und schreibt danach noch den
# Erfolgsstatus – die NEUE Server-Instanz liest ihn dann aus.
phase reload "Server neu starten"
pm2 reload ecosystem.config.js --update-env
pm2 save

write_status success done "Update abgeschlossen."
echo "[$(date -Is)] Update abgeschlossen auf $REMOTE."
