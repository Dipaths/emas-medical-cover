# Hosting the EMAS web app (needed before the Android app can work)

> Patient data: host only where your organisation's data-protection / MOH policy allows. A small server inside your own network or an approved local provider is preferable to an arbitrary overseas VPS.

## 1. Server
Any Linux box (1 vCPU / 1 GB is plenty) with a public IP, DNS record for your domain (e.g. `emas.example.org`) pointing at it, ports 80/443 open.
Install: `bun`, `caddy`, `sqlite3`. Create a user: `sudo useradd -r -m emas`.

## 2. App
```bash
sudo mkdir -p /opt/emas-web /var/lib/emas && sudo chown emas /var/lib/emas
# copy the project to /opt/emas-web, then:
cd /opt/emas-web
cp .env.example .env     # set DATABASE_URL=file:/var/lib/emas/custom.db and AUTH_SECRET=$(openssl rand -base64 48)
bun install && bun run db:push && bun run build
bun scripts/create-admin.ts you@domain "Your Name" 'a-long-password1'
sudo cp deploy/emas-web.service /etc/systemd/system/ && sudo systemctl enable --now emas-web
```
(`bun run build` copies static files into `.next/standalone` — the service runs from there.)

## 3. HTTPS
`EMAS_DOMAIN=emas.example.org caddy run --config deploy/Caddyfile.production` (or install it as a service). Caddy gets and renews the certificate automatically. Do **not** use the repo's original `Caddyfile` in production: its `XTransformPort` rule lets any visitor reach other local services on the server.

## 4. Check
Open `https://emas.example.org`, sign in, change the temporary password, add a test user in **Staff**, submit a test event and triage record, open **Audit**. On a phone, use *Install app* / *Add to Home Screen*.

## 5. Keep it healthy
* `deploy/backup.sh` nightly (cron), copy backups off the server, encrypted.
* Firewall: allow only 22 (restricted), 80, 443. Keep the OS and Bun updated.
* Review the **Audit** tab regularly; suspend leavers in **Staff** the same day.

## 6. Android app
See `emas-android/README.md`. Once this site is live, build the app against your domain, then publish `/.well-known/assetlinks.json` from `deploy/assetlinks.json.template` (put the filled file in `public/.well-known/`, rebuild).
