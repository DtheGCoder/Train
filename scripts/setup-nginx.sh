#!/usr/bin/env bash
# Richtet nginx als Reverse Proxy fuer Train ein + Let's Encrypt HTTPS.
#
# SICHERHEIT: Das Skript legt NUR eine eigene Site-Datei an
# (/etc/nginx/sites-available/train) und fasst bestehende nginx-Sites NICHT an.
# Es validiert mit `nginx -t`, BEVOR neu geladen wird. Schlaegt die Validierung
# fehl, wird die Train-Site wieder entfernt und nichts neu geladen -> bestehende
# Seiten bleiben unveraendert online.
#
# Nutzung (als root):
#   sudo bash scripts/setup-nginx.sh <domain> [port] [email]
#
# Beispiele:
#   sudo bash scripts/setup-nginx.sh train.example.de
#   sudo bash scripts/setup-nginx.sh train.example.de 3000 admin@example.de
#
# Parameter koennen auch per Env gesetzt werden:
#   TRAIN_DOMAIN, PORT, LE_EMAIL
set -euo pipefail

DOMAIN="${1:-${TRAIN_DOMAIN:-}}"
PORT="${2:-${PORT:-3000}}"
EMAIL="${3:-${LE_EMAIL:-}}"

# --- Eingaben pruefen ---------------------------------------------------------
if [ -z "$DOMAIN" ]; then
  echo "FEHLER: Domain fehlt." >&2
  echo "Nutzung: sudo bash scripts/setup-nginx.sh <domain> [port] [email]" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "FEHLER: Bitte als root ausfuehren (sudo)." >&2
  exit 1
fi

echo "==> Train nginx-Setup: Domain=$DOMAIN  Port=$PORT"

# --- nginx vorhanden? ---------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  echo "==> nginx nicht gefunden, installiere..."
  apt-get update -y && apt-get install -y nginx
fi

# --- DNS-Sanity-Check (nur Warnung, kein Abbruch) -----------------------------
SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || true)"
DNS_IP="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1 || true)"
if [ -n "$SERVER_IP" ] && [ -n "$DNS_IP" ] && [ "$SERVER_IP" != "$DNS_IP" ]; then
  echo "WARNUNG: $DOMAIN zeigt per DNS auf $DNS_IP, dieser Server hat $SERVER_IP."
  echo "         Let's Encrypt schlaegt fehl, wenn der A-Record nicht auf diesen Server zeigt."
fi

# --- Konflikt-Check: bedient eine ANDERE Site diese Domain schon? -------------
SITE_AVAIL="/etc/nginx/sites-available/train"
SITE_ENABLED="/etc/nginx/sites-enabled/train"

EXISTING="$(grep -rlE "server_name[^;]*\b${DOMAIN}\b" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null \
  | grep -vF "$SITE_ENABLED" | grep -vF "$SITE_AVAIL" || true)"
if [ -n "$EXISTING" ]; then
  echo "WARNUNG: $DOMAIN wird moeglicherweise schon von folgenden Configs bedient:"
  echo "$EXISTING"
  echo "         Es wird trotzdem fortgefahren - pruefe danach auf Konflikte."
fi

# --- Backup bestehender enabled-Sites (zur Sicherheit) ------------------------
BACKUP_DIR="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -a /etc/nginx/sites-enabled "$BACKUP_DIR/" 2>/dev/null || true
cp -a /etc/nginx/sites-available "$BACKUP_DIR/" 2>/dev/null || true
echo "==> Backup der nginx-Sites unter: $BACKUP_DIR"

# --- Site-Datei schreiben (HTTP; certbot ergaenzt spaeter HTTPS) --------------
cat > "$SITE_AVAIL" <<NGINX
# Auto-generiert von scripts/setup-nginx.sh - Reverse Proxy fuer Train.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Groessere Uploads (z.B. Bilder) erlauben
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        # RSC/Streaming nicht puffern
        proxy_set_header X-Accel-Buffering no;
    }
}
NGINX

ln -sf "$SITE_AVAIL" "$SITE_ENABLED"

# --- Validieren BEVOR reload; bei Fehler zurueckrollen ------------------------
echo "==> nginx -t (Validierung)"
if ! nginx -t; then
  echo "FEHLER: nginx-Konfiguration ungueltig. Entferne Train-Site, lade NICHT neu." >&2
  rm -f "$SITE_ENABLED"
  exit 1
fi

echo "==> nginx reload"
systemctl reload nginx

# --- certbot installieren falls noetig ----------------------------------------
if ! command -v certbot >/dev/null 2>&1; then
  echo "==> certbot nicht gefunden, installiere..."
  apt-get update -y && apt-get install -y certbot python3-certbot-nginx
fi

# --- HTTPS holen + HTTP->HTTPS-Redirect ---------------------------------------
# Hinweis: --agree-tos akzeptiert die Let's-Encrypt-Nutzungsbedingungen.
# Du fuehrst dieses Skript auf deinem eigenen Server aus; damit stimmst du den
# ACME-/Let's-Encrypt-Bedingungen zu.
if [ -n "$EMAIL" ]; then
  EMAIL_ARG=(-m "$EMAIL")
else
  EMAIL_ARG=(--register-unsafely-without-email)
fi

echo "==> certbot: Zertifikat holen und nginx auf HTTPS umstellen"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${EMAIL_ARG[@]}"; then
  echo "==> TLS aktiv."
else
  echo "WARNUNG: certbot ist fehlgeschlagen. Train laeuft weiter ueber HTTP auf Port 80." >&2
  echo "         Haeufigste Ursache: DNS-A-Record fuer $DOMAIN zeigt nicht auf diesen Server," >&2
  echo "         oder Port 80/443 ist von aussen nicht erreichbar (Firewall/Security Group)." >&2
fi

# --- Abschliessend nochmal validieren -----------------------------------------
nginx -t && systemctl reload nginx

echo ""
echo "==> Fertig."
echo "    HTTP : http://${DOMAIN}  (leitet auf HTTPS um, wenn TLS aktiv ist)"
echo "    HTTPS: https://${DOMAIN}"
echo "    Backup der vorherigen nginx-Config: $BACKUP_DIR"
