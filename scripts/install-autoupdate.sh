#!/usr/bin/env bash
# Richtet das voll-automatische Update als systemd-Timer ein (alle 5 Minuten).
#
# Vorteil gegenüber cron: läuft als der RICHTIGE User, mit dem PATH dieses
# Users (inkl. nvm), und der Status/Logs sind über systemctl/journalctl
# einsehbar. Idempotent – mehrfach ausführbar.
#
# Nutzung (als root):
#   sudo bash scripts/install-autoupdate.sh
#
# Der Update-Prozess läuft standardmäßig als der User, dem das Projekt-
# verzeichnis gehört (nicht root). Überschreibbar via:
#   sudo RUN_AS=deploy bash scripts/install-autoupdate.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "FEHLER: Bitte als root ausführen (sudo)." >&2
  exit 1
fi

# Projektverzeichnis = eine Ebene über diesem Skript, absolut auflösen.
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$PROJECT_DIR/scripts/auto-update.sh"

if [ ! -f "$SCRIPT" ]; then
  echo "FEHLER: $SCRIPT nicht gefunden." >&2
  exit 1
fi
chmod +x "$SCRIPT"

# User bestimmen, unter dem das Update laufen soll: per Env RUN_AS oder der
# Eigentümer des Projektverzeichnisses (so stimmt der PATH/nvm-Kontext).
RUN_AS="${RUN_AS:-$(stat -c '%U' "$PROJECT_DIR")}"
if ! id "$RUN_AS" >/dev/null 2>&1; then
  echo "FEHLER: User '$RUN_AS' existiert nicht." >&2
  exit 1
fi
echo "==> Update läuft als User: $RUN_AS"
echo "==> Projektverzeichnis:    $PROJECT_DIR"

SERVICE=/etc/systemd/system/train-update.service
TIMER=/etc/systemd/system/train-update.timer

cat > "$SERVICE" <<UNIT
[Unit]
Description=Train auto-update from GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=${RUN_AS}
WorkingDirectory=${PROJECT_DIR}
# Login-Shell, damit nvm/PATH des Users geladen werden.
ExecStart=/bin/bash -lc '${SCRIPT}'
UNIT

cat > "$TIMER" <<UNIT
[Unit]
Description=Run Train auto-update every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

# logs/ anlegen und dem Run-User geben, damit das Skript schreiben darf.
mkdir -p "$PROJECT_DIR/logs"
chown -R "$RUN_AS" "$PROJECT_DIR/logs" 2>/dev/null || true

systemctl daemon-reload
systemctl enable --now train-update.timer

echo ""
echo "==> Fertig. Timer aktiv."
echo "    Status:        systemctl status train-update.timer"
echo "    Nächste Läufe: systemctl list-timers train-update.timer"
echo "    Jetzt testen:  sudo systemctl start train-update.service"
echo "    Logs (systemd): journalctl -u train-update.service -n 50 --no-pager"
echo "    Logs (Datei):   tail -n 50 $PROJECT_DIR/logs/auto-update.log"
