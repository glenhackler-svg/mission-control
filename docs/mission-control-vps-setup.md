# Mission Control — VPS Setup Guide

**Audience:** Xenler Consulting — internal reference for deploying Mission Control on a client VPS.

A custom operations dashboard built with Next.js 16 + PostgreSQL 16.
Replaces Asana for task/project tracking. Gives every client a branded,
self-hosted control center with agent status, task management, and email.

---

## STACK

- Next.js 16 (App Router, TypeScript)
- PostgreSQL 16 (installed directly on the VPS)
- Prisma ORM
- Tailwind CSS
- AgentMail API (email panel)

---

## PRE-REQUISITES

The VPS should already have OpenClaw installed and running. These steps
assume Ubuntu 22.04 or 24.04 LTS. Run all commands as root or a sudo user.

---

## STEP 1 — Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # should show v20.x
npm -v
```

---

## STEP 2 — Install PostgreSQL 16

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
systemctl status postgresql   # confirm active (running)
```

Create the database and set up the postgres user:

```bash
sudo -u postgres psql -c "CREATE DATABASE mission_control;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_strong_password';"
```

Update `pg_hba.conf` to allow password auth on localhost (if not already set):

```bash
# Find pg_hba.conf:
sudo -u postgres psql -c "SHOW hba_file;"

# Edit it — change "peer" or "ident" to "md5" for local connections:
nano /etc/postgresql/16/main/pg_hba.conf
# Change the line:
#   local   all   postgres   peer
# To:
#   local   all   postgres   md5
# Then restart:
systemctl restart postgresql
```

Test the connection:

```bash
psql postgresql://postgres:your_strong_password@localhost:5432/mission_control -c "SELECT 1;"
```

---

## STEP 3 — Clone the Repo

```bash
cd /home   # or /opt, wherever you want it
git clone https://github.com/glenhackler-svg/openclaw-workspace.git   # or the mission-control repo directly
# Or if using the mission-control repo:
git clone https://github.com/sharbelxyz/openclaw-mission-control.git mission-control
cd mission-control
npm install
```

---

## STEP 4 — Configure Environment

```bash
cp .env.example .env.local
nano .env.local
```

Fill in these values:

```env
DATABASE_URL=postgresql://postgres:your_strong_password@localhost:5432/mission_control
INTERNAL_API_SECRET=$(openssl rand -hex 32)
AGENTMAIL_API_KEY=your_client_agentmail_api_key
```

Generate the secret separately and paste it in:

```bash
openssl rand -hex 32
```

Save that secret — the OpenClaw agents on this VPS will need it to POST status updates.

---

## STEP 5 — Push Schema & Seed

```bash
npx prisma db push
npx prisma generate
```

Seed the client's agents (edit `prisma/seed.ts` first to replace demo agents with real ones):

```bash
npm run seed:demo   # use demo data first to verify everything works
```

---

## STEP 6 — Branding

Update the client name in 3 files:

- `src/app/layout.tsx` — `<title>` tag
- `src/app/page.tsx` — h1 heading
- `src/components/sidebar.tsx` — sidebar header text

Replace `"Xenler Mission Control"` with `"[Client Name] Mission Control"`.

---

## STEP 7 — Build & Run with PM2

Install PM2 globally:

```bash
npm install -g pm2
```

Build the Next.js app:

```bash
npm run build
```

Start with PM2:

```bash
pm2 start npm --name mission-control -- run start
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Verify it's running:

```bash
pm2 status
curl http://localhost:3000/api/health
# Should return: {"ok":true,"db":"connected"}
```

---

## STEP 8 — Expose on a Port (Optional but Recommended)

By default Mission Control runs on port 3000. If you want it accessible
on a subdomain (e.g. `dashboard.clientdomain.com`), set up nginx as a
reverse proxy:

```bash
apt install -y nginx
nano /etc/nginx/sites-available/mission-control
```

Paste:

```nginx
server {
    listen 80;
    server_name dashboard.clientdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/mission-control /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

For HTTPS (recommended), use Let's Encrypt:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d dashboard.clientdomain.com
```

---

## STEP 9 — Wire OpenClaw Agents

Each OpenClaw agent on this VPS needs to POST its status to Mission Control.
Add a heartbeat cron in the agent's OpenClaw config that calls:

```bash
POST http://localhost:3000/api/agents/state
Authorization: Bearer YOUR_INTERNAL_API_SECRET
Content-Type: application/json

{
  "id": "main-agent",
  "name": "Main Agent",
  "emoji": "🤖",
  "role": "Operations",
  "status": "online",
  "currentTask": "Monitoring inbox"
}
```

---

## STEP 10 — Mail Tab (AgentMail)

1. Create an AgentMail account at [agentmail.to](https://agentmail.to)
2. Add the client's domain
3. Configure DNS: DKIM, SPF, MX, DMARC via AgentMail dashboard or API
4. Create inboxes for the client
5. Add the API key to `.env.local` as `AGENTMAIL_API_KEY`

AgentMail Developer plan ($20/month) supports up to 10 custom domains.

---

## TABS INCLUDED

| Tab | Purpose |
|-----|---------|
| Dashboard | Agent status overview (OpenClaw agent health) |
| Tasks | Full project/task management with time tracking |
| Mail | 3-pane email client via AgentMail |
| Missions | Placeholder for future workflow automation |

---

## NOTES

- Each client gets their own Mission Control instance on their VPS
- Branded with client name throughout
- `INTERNAL_API_SECRET` must be unique per client — generate fresh each time
- After build, projects and tasks are created fresh from scratch — no Asana import needed
- Claw can manage tasks via Telegram using:
  - `POST /api/tasks/create`
  - `POST /api/tasks/update`
  - `GET /api/tasks/list`

---

*Maintained by Glen Hackler — Xenler Consulting (xenlerconsulting.com)*
