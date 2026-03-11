# Duopara — Deployment & Update Guide

This guide covers deploying **both backend and frontend** on a single Linux server using **nginx** as a reverse-proxy / static file server.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [First-time Deployment](#first-time-deployment)
  - [1. Server user & directory](#1-server-user--directory)
  - [2. Clone & install](#2-clone--install)
  - [3. Configure the backend](#3-configure-the-backend)
  - [4. Choose & initialise the database](#4-choose--initialise-the-database)
  - [5. Build the backend](#5-build-the-backend)
  - [6. Build the frontend](#6-build-the-frontend)
  - [7. Create a systemd service](#7-create-a-systemd-service)
  - [8. Configure nginx](#8-configure-nginx)
  - [9. TLS with Certbot (optional but recommended)](#9-tls-with-certbot-optional-but-recommended)
- [Updating](#updating)
- [Database providers](#database-providers)
- [Switching databases after first deploy](#switching-databases-after-first-deploy)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these on the server before you start.

```bash
# Node.js 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# nginx
sudo apt-get install -y nginx

# (optional) PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# (optional) MySQL / MariaDB
sudo apt-get install -y mariadb-server

# (optional) Certbot for TLS
sudo apt-get install -y certbot python3-certbot-nginx
```

Verify versions:

```bash
node -v   # should be ≥ 20
npm  -v   # should be ≥ 10
nginx -v
```

---

## First-time Deployment

### 1. Server user & directory

Run the app as a dedicated, non-root user.

```bash
sudo useradd -r -m -d /var/www/duopara -s /bin/bash duopara
sudo su - duopara
```

All subsequent steps are as the `duopara` user unless noted.

### 2. Clone & install

```bash
git clone https://github.com/<your-org>/duopara.git /var/www/duopara/app
cd /var/www/duopara/app
npm install
```

### 3. Configure the backend

```bash
cd /var/www/duopara/app/packages/backend
cp .env.example .env
nano .env          # fill in every value — see the sections below
```

**Minimum required values in `packages/backend/.env`:**

```dotenv
# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_PROVIDER="sqlite"          # or "mysql" / "postgresql"
DATABASE_URL="file:./prod.db"       # adjust per provider — see §Database providers

# ── Server ───────────────────────────────────────────────────────────────────
PORT=3009
FRONTEND_URL="https://yourdomain.com"   # no trailing slash

# ── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET="a-long-random-string"   # generate: openssl rand -hex 32

# ── LLM ──────────────────────────────────────────────────────────────────────
OPENAI_API_KEY="sk-..."

# ── Environment ──────────────────────────────────────────────────────────────
NODE_ENV="production"
```

### 4. Choose & initialise the database

#### SQLite (simplest — no extra setup)

```dotenv
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:/var/www/duopara/data/prod.db"
```

```bash
mkdir -p /var/www/duopara/data
```

#### PostgreSQL

```bash
# as root / postgres user:
sudo -u postgres psql -c "CREATE USER duopara WITH PASSWORD 'strongpassword';"
sudo -u postgres psql -c "CREATE DATABASE duopara OWNER duopara;"
```

```dotenv
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://duopara:strongpassword@localhost:5432/duopara"
```

#### MySQL / MariaDB

```bash
sudo mysql -e "CREATE USER 'duopara'@'localhost' IDENTIFIED BY 'strongpassword';"
sudo mysql -e "CREATE DATABASE duopara CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "GRANT ALL PRIVILEGES ON duopara.* TO 'duopara'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

```dotenv
DATABASE_PROVIDER="mysql"
DATABASE_URL="mysql://duopara:strongpassword@localhost:3306/duopara"
```

Run the schema migration (works for every provider):

```bash
cd /var/www/duopara/app
npm run db:generate
npm run db:push
```

### 5. Build the backend

```bash
cd /var/www/duopara/app
npm run build --workspace=@duopara/backend
```

Output lands in `packages/backend/dist/`.

### 6. Build the frontend

The frontend build is static HTML/CSS/JS — nginx will serve it directly.

```bash
cd /var/www/duopara/app
npm run build --workspace=@duopara/frontend
```

Output lands in `packages/frontend/dist/`.

> **No `.env` needed for production frontend builds.**  
> In production all API calls go to `/api` which nginx proxies to the backend.  
> Only set `VITE_PORT` / `VITE_API_URL` in `packages/frontend/.env` for local
> development.

### 7. Create a systemd service

Exit back to root for the systemd steps.

```bash
exit   # back to root / sudo user
```

Create `/etc/systemd/system/duopara-backend.service`:

```ini
[Unit]
Description=Duopara Backend API
After=network.target

[Service]
Type=simple
User=duopara
WorkingDirectory=/var/www/duopara/app/packages/backend
EnvironmentFile=/var/www/duopara/app/packages/backend/.env
ExecStart=/usr/bin/node /var/www/duopara/app/packages/backend/dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=duopara-backend

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable duopara-backend
sudo systemctl start  duopara-backend
sudo systemctl status duopara-backend
```

### 8. Configure nginx

Create `/etc/nginx/sites-available/duopara`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # ── Frontend (static files) ──────────────────────────────────────────────
    root /var/www/duopara/app/packages/frontend/dist;
    index index.html;

    # SPA fallback — all unknown paths return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Backend API (reverse proxy) ──────────────────────────────────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running LLM requests
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # ── Health check ─────────────────────────────────────────────────────────
    location /health {
        proxy_pass http://127.0.0.1:3009/health;
    }
}
```

Enable the site and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/duopara /etc/nginx/sites-enabled/duopara
sudo nginx -t          # check config is valid
sudo systemctl reload nginx
```

### 9. TLS with Certbot (optional but recommended)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will modify the nginx config automatically. After this, HTTP traffic is redirected to HTTPS.

Auto-renewal is set up by default; verify with:

```bash
sudo systemctl status certbot.timer
```

---

## Updating

Run these steps every time you deploy a new version.

```bash
# 1. Pull latest code
cd /var/www/duopara/app
git pull origin main          # or your production branch

# 2. Install any new dependencies
npm install

# 3. Apply any new database migrations
npm run db:generate
npm run db:push

# 4. Rebuild backend
npm run build --workspace=@duopara/backend

# 5. Rebuild frontend
npm run build --workspace=@duopara/frontend

# 6. Restart the backend service
sudo systemctl restart duopara-backend

# nginx does not need a restart — it already serves the new dist/ files.
```

> **Zero-downtime tip:** systemd restarts the process in ~1-2 s. If you need
> true zero-downtime, run two instances behind nginx with `upstream` and
> cycle them one at a time. For most hobby/small-team deployments the brief
> restart is acceptable.

---

## Database providers

| Provider | `DATABASE_PROVIDER` | Example `DATABASE_URL` |
|---|---|---|
| SQLite | `sqlite` | `file:/var/www/duopara/data/prod.db` |
| PostgreSQL | `postgresql` | `postgresql://user:pass@localhost:5432/duopara` |
| MySQL / MariaDB | `mysql` | `mysql://user:pass@localhost:3306/duopara` |

After changing either value, always re-run:

```bash
npm run db:generate && npm run db:push
```

---

## Switching databases after first deploy

> **Warning:** This will not migrate existing data. You need to export/import
> data manually if you want to preserve it.

1. Stop the backend: `sudo systemctl stop duopara-backend`
2. Update `DATABASE_PROVIDER` and `DATABASE_URL` in `packages/backend/.env`
3. Create the new database/user (see §4 above)
4. Re-run `npm run db:generate && npm run db:push`
5. Start the backend: `sudo systemctl start duopara-backend`

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` | Backend isn't running — check `sudo systemctl status duopara-backend` and `sudo journalctl -u duopara-backend -n 50` |
| Frontend shows blank page | Check that `packages/frontend/dist/index.html` exists. Rebuild if missing. |
| `DATABASE_PROVIDER` unknown | Ensure value is exactly `sqlite`, `mysql`, or `postgresql` (lowercase) |
| Prisma client stale | Run `npm run db:generate` and rebuild |
| CORS errors in browser | Make sure `FRONTEND_URL` in backend `.env` matches your actual domain (no trailing slash) |
| LLM requests timeout | Increase `proxy_read_timeout` in nginx and check your API key |

Check live backend logs:

```bash
sudo journalctl -u duopara-backend -f
```

Check nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```
