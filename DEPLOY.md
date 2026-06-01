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
Commit automatisch (pull → install → migrate → build → `pm2 reload`). Es
schreibt **immer** ein Log nach `logs/auto-update.log` und sichert PATH/nvm so
ab, dass es auch unter cron/systemd zuverlässig läuft.

### Empfohlen: systemd-Timer per Installer

```bash
sudo bash scripts/install-autoupdate.sh
```

Der Installer legt `train-update.service` + `.timer` an, aktiviert sie und
lässt das Update als den **richtigen User** laufen (Eigentümer des
Projektordners – wichtig, damit nvm/PATH stimmen). Überschreibbar:

```bash
sudo RUN_AS=deploy bash scripts/install-autoupdate.sh
```

Prüfen & sofort testen:

```bash
systemctl list-timers train-update.timer      # nächste Läufe
sudo systemctl start train-update.service      # einmal jetzt ausführen
journalctl -u train-update.service -n 50 --no-pager
tail -n 50 logs/auto-update.log
```

### Alternative: cron

```bash
crontab -e
```

Zeile hinzufügen (alle 5 Minuten, mit Lock gegen Überlappung). Das Skript
loggt selbst – **keine** `>>`-Umleitung nötig (die scheitert, wenn `logs/`
noch fehlt):

```
*/5 * * * * /usr/bin/flock -n /tmp/train-update.lock /var/www/train/scripts/auto-update.sh
```

> Hinweis: Auto-Update führt Code aus GitHub aus, sobald dort ein neuer Commit
> liegt. Stelle sicher, dass nur vertrauenswürdige Personen Push-Rechte auf das
> Repository haben.

### Troubleshooting: „Es passiert nichts"

1. **Läuft der Timer überhaupt?**
   `systemctl list-timers train-update.timer` – steht dort ein „NEXT"?
   Sonst Installer (oben) ausführen.
2. **Was sagt das Log?**
   `tail -n 50 logs/auto-update.log` bzw.
   `journalctl -u train-update.service -n 50 --no-pager`.
3. **`npm/npx/pm2: command not found`** → Node via nvm, aber falscher User.
   Den Installer mit `RUN_AS=<dein-user>` neu ausführen.
4. **`detected dubious ownership in repository`** → Repo gehört einem anderen
   User. Fix: `git config --global --add safe.directory /var/www/train`
   (das Skript macht das jetzt automatisch).
5. **Manuell prüfen, ob ein Update erkannt wird:**
   `bash scripts/auto-update.sh && tail -n 30 logs/auto-update.log`.

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
