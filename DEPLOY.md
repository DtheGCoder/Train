# Train – Deployment auf Ubuntu (PM2 + Auto-Update)

Diese Anleitung richtet Train auf einem frischen Ubuntu-Server (22.04/24.04)
ein: Node.js, Build, Start via PM2 und ein voll-automatisches Update aus
GitHub.

## 1. Voraussetzungen installieren

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential git

# PM2 global
sudo npm install -g pm2
```

> `build-essential` wird benötigt, weil `better-sqlite3` beim `npm ci` nativ
> für die Server-Architektur kompiliert wird.

## 2. Code holen

```bash
sudo mkdir -p /var/www && cd /var/www
git clone https://github.com/DtheGCoder/Train.git train
cd train
```

## 3. Umgebung konfigurieren

```bash
cp .env.example .env
nano .env   # DATABASE_URL, PORT, ADMIN_PASSWORD anpassen
```

Wichtig:

- `NODE_ENV=production` sorgt für sichere (HTTPS-only) Session-Cookies.
- `DATABASE_URL="file:./prod.db"` legt die SQLite-DB im Projektordner an.
- `ADMIN_PASSWORD` wird nur beim allerersten Seed verwendet.

## 4. Erstes Deployment

```bash
bash scripts/deploy.sh
```

Das Skript installiert Abhängigkeiten, erzeugt den Prisma-Client, wendet
Migrationen an, seedet (idempotent) die Übungs-DB und den Admin-Account,
baut die App und startet sie unter PM2.

PM2 beim Boot automatisch starten:

```bash
pm2 startup systemd      # gibt einen sudo-Befehl aus -> ausführen
pm2 save
```

## 5. Reverse Proxy (empfohlen: nginx + HTTPS)

```nginx
server {
  listen 80;
  server_name deine-domain.de;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    # Streaming (RSC) nicht puffern
    proxy_set_header X-Accel-Buffering no;
  }
}
```

Danach TLS via Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d deine-domain.de
```

## 6. Voll-automatisches Update einrichten

Das Skript `scripts/auto-update.sh` prüft GitHub und aktualisiert bei neuem
Commit automatisch (pull → install → migrate → build → `pm2 reload`).

### Variante A: cron (einfach)

```bash
crontab -e
```

Zeile hinzufügen (Prüfung alle 5 Minuten, mit Lock gegen Überlappung):

```
*/5 * * * * /usr/bin/flock -n /tmp/train-update.lock /var/www/train/scripts/auto-update.sh >> /var/www/train/logs/auto-update.log 2>&1
```

### Variante B: systemd-Timer

`/etc/systemd/system/train-update.service`:

```ini
[Unit]
Description=Train auto-update from GitHub

[Service]
Type=oneshot
WorkingDirectory=/var/www/train
ExecStart=/var/www/train/scripts/auto-update.sh
User=www-data
```

`/etc/systemd/system/train-update.timer`:

```ini
[Unit]
Description=Run Train auto-update every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Aktivieren:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now train-update.timer
```

> Hinweis: Auto-Update führt Code aus GitHub aus, sobald dort ein neuer Commit
> liegt. Stelle sicher, dass nur vertrauenswürdige Personen Push-Rechte auf das
> Repository haben.

## 7. Nützliche Befehle

```bash
pm2 status            # Prozessstatus
pm2 logs train        # Live-Logs
pm2 reload train      # Neu laden (Zero-Downtime)
bash scripts/deploy.sh   # Manuelles Voll-Deployment
```

## Auth-Hinweise

- Login unter `/login`. Kein öffentliches Registrieren.
- Neue Benutzer legt ein Admin unter `/admin` an.
- Sessions liegen in der DB; Cookie `train_session` ist httpOnly und (in
  Produktion) `Secure`.
- **Standard-Admin nach erstem Seed:** `admin` / `train1234` (bzw. dein
  `ADMIN_PASSWORD`). Bitte sofort einen neuen Admin anlegen und den Standard
  entfernen.
