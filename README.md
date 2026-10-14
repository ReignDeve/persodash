# PersoDash

A self-hosted personal command center. One place for the things that keep running in the background of my digital life – mining workers, websites, wallets, trips – with a focus on _what needs attention right now_.

Runs entirely on my own VPS: Next.js app + PostgreSQL in Docker, no third-party database or auth provider.

## Modules

| Module            | What it does                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**      | Cockpit: attention list (outages, offline workers, due renewals, unread errors), instrument strip, focus (next step per project), activity feed, host status, upcoming renewals                                                                                                              |
| **Weekly review** | The week at a glance: auto-written highlights, km per day, commits and deploys per project, service uptime, routines done/missed, inbox, portfolio change, renewals. Browse past weeks; sent to Telegram on Sundays                                                                          |
| **Routines**      | Recurring tasks on a fixed rhythm (daily … yearly, every N): tick off and they reschedule, skip or snooze, reminders when due, streaks and on-time history. Templates to start; due ones appear on the overview                                                                              |
| **Inbox**         | Quick capture from anywhere (`N`, `⌘K` → “Capture …”, mobile +, API). Notes can be pinned, linked to a project or promoted to a project's next step in one click                                                                                                                             |
| **Projects**      | Hub per side project: GitHub activity (last push, PRs, issues, commits), Vercel deployment, linked services and costs, status and an inline-editable next step. One-click import from Vercel                                                                                                 |
| **Services**      | Uptime monitors for your own endpoints (VPS, LUCY, home server): checked every 2 min, 30-day uptime bars, latency, alerts on down/recovery                                                                                                                                                   |
| **Subscriptions** | Recurring costs normalised to EUR/month, category breakdown, renewal dates that roll forward automatically, reminders N days before renewal                                                                                                                                                  |
| **Actions**       | API playground run from the server (reaches `localhost` and Docker services): send requests, save them as actions with an expected status, encrypted secret headers (`SECRETS_KEY`), run history, and flows that chain actions with stop-on-failure. Runnable from ⌘K and the Automation API |
| **Miner**         | Public Pool workers, online/low/offline state, 48 h hashrate history from our own snapshots                                                                                                                                                                                                  |
| **Websites**      | Vercel projects with last production deployment _and_ a real reachability check of each domain                                                                                                                                                                                               |
| **Wallets**       | Watch-only BTC/SOL addresses (stored in the DB), Coinbase balances, EUR valuation, allocation                                                                                                                                                                                                |
| **Logbook**       | Trip log with monthly chart, filters, one-tap templates for recurring trips, CSV export for tax records                                                                                                                                                                                      |
| **Notifications** | Persistent alerts with read state, forwarded to Telegram; alerts fire on state _transitions_, not on every poll                                                                                                                                                                              |
| **Settings**      | Password, active sessions, API tokens, alert thresholds, daily summary, integration status, host metrics                                                                                                                                                                                     |

Global: command palette (`⌘K` / `Ctrl K`) with search across all data, keyboard navigation, installable PWA.

## Keyboard

| Keys                                                             | Action                                                                                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `⌘K` / `Ctrl K`                                                  | Command palette & search                                                                                                                                                            |
| `N`                                                              | Capture a note                                                                                                                                                                      |
| `C`                                                              | Log a trip                                                                                                                                                                          |
| `G` then `O` `V` `I` `R` `P` `W` `U` `A` `M` `F` `B` `L` `N` `S` | Go to Overview, Weekly review, Inbox, Routines, Projects, Websites, Services (Uptime), Actions, Miner, Wallets (Finance), Subscriptions (Billing), Logbook, Notifications, Settings |
| `[`                                                              | Collapse / expand sidebar                                                                                                                                                           |

## Stack

- **Next.js 16** (App Router, standalone output) · React 19 · TypeScript (strict)
- **PostgreSQL 17** via **Prisma 7** (`@prisma/adapter-pg`)
- UI: own design system on **Radix UI** primitives, **cmdk**, **sonner**, **Lucide** icons, **Recharts**, Tailwind CSS 4
- Data: **TanStack Query** (caching, polling, optimistic updates), **react-hook-form** + **zod** (shared validation client/server)

## Architecture

```
app/                    routes only – thin pages + API route handlers
  (auth)/login          sign-in
  (dashboard)/…         pages; the layout validates the session
  api/…                 JSON API, every private route wrapped in `authed()`
features/<module>/      page views, dialogs, mutations per module
components/ui/          design system (Button, Dialog, Table, Metric, Status …)
components/shell/       sidebar, mobile nav, topbar, command palette
lib/
  schemas/              zod schemas + DTO types shared by client and server
  api/                  route-handler wrapper, error model, client fetcher, query hooks
  auth/                 password hashing, sessions, rate limiting
  format.ts             all number/date formatting
server/
  services/             business logic (one file per domain)
  integrations/         external APIs (Public Pool, Vercel, Coinbase, chains, prices, Telegram)
  scheduler.ts          in-process jobs: miner snapshots + alerts, daily summary, session cleanup
prisma/                 schema + migrations
proxy.ts                CSRF origin check + cheap session gate on every request
```

Rules of thumb: UI never touches the database; route handlers only parse input and call a service; services own validation of business rules; every external call has a timeout and a small TTL cache.

## Security

- Users in the DB, passwords hashed with **scrypt** (Node built-in), sessions are random 256-bit tokens stored as SHA-256 hashes
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30-day sliding expiry; sessions can be revoked in Settings
- Login rate limit (5 attempts / 15 min per IP), constant-time comparisons
- CSRF: state-changing API requests must carry a same-origin `Origin` header
- Strict security headers (CSP, HSTS, `X-Frame-Options: DENY`, …)
- Cron endpoints require `Authorization: Bearer $CRON_SECRET`
- Secrets only in `.env` (never committed); external APIs are only called server-side
- Secret values stored in the DB (action headers) are AES-256-GCM encrypted with `SECRETS_KEY` and never sent back to the browser
- Actions can reach anything the server can (that's the point) – they are only available to signed-in users and scoped tokens
- Passkeys/WebAuthn can be added later as a second credential type on `User` without changing sessions

## Local development

Requirements: Node 22, Docker (for Postgres).

```bash
docker run -d --name persodash-db -e POSTGRES_USER=persodash -e POSTGRES_PASSWORD=persodash_dev -e POSTGRES_DB=persodash -p 5433:5432 postgres:17-alpine
```

```bash
cp .env.example .env   # set DATABASE_URL=postgresql://persodash:persodash_dev@localhost:5433/persodash
npm install
npm run db:migrate:dev
npm run user:create -- <username>
npm run dev
```

In development the scheduler is off and Telegram messages are suppressed by default, so a local instance never notifies you next to production. Opt in with `SCHEDULER_ENABLED=true` / `TELEGRAM_IN_DEV=true`.

## Deployment (VPS)

```bash
git clone … /opt/persodash && cd /opt/persodash
cp .env.example .env            # set POSTGRES_PASSWORD, integrations, PERSODASH_DOMAIN
docker compose up -d --build    # db → migrate → app (bound to 127.0.0.1:3000)
```

HTTPS:

- **Caddy included:** `docker compose --profile proxy up -d` – automatic Let's Encrypt certificate for `PERSODASH_DOMAIN`.
- **Existing reverse proxy:** forward to `127.0.0.1:3000` and pass the `Host` header (nginx: `proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).

First account – either way works:

- With an empty users table, logging in with `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` from `.env` creates the account (stored hashed). Remove both variables afterwards.
- Or create it explicitly: `docker compose run --rm migrate npm run user:create -- <username>` (also resets a forgotten password).

The database container uses `restart: unless-stopped`; if PostgreSQL is unreachable, PersoDash shows a clear notice (and the API answers `503 database_unavailable`) instead of failing with a stack trace.

Backups: `deploy/backup.sh` (daily `pg_dump`, 14 days retention – see the script for the crontab line).

### Migrating from the SQLite version

The old version stored the logbook in `dev.db`. Copy that file next to the project and run once (idempotent):

```bash
DATABASE_URL=postgresql://persodash:<password>@localhost:5432/persodash npm run db:import-sqlite -- ./dev.db
```

With the Docker setup, run it inside the `migrate` image instead:

```bash
docker compose run --rm -v "$PWD/dev.db:/app/dev.db:ro" migrate npm run db:import-sqlite -- ./dev.db
```

## Automation API

For LUCY, iOS Shortcuts and scripts. Create a token under **Settings → API tokens** (scoped, revocable, stored as a hash) and send it as `Authorization: Bearer pd_…`.

| Endpoint                             | Scope           | Body / result                                                                                                                    |
| ------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/automation/summary`        | `read`          | Headline, attention items, inbox count, next steps, renewals, key figures                                                        |
| `POST /api/automation/notes`         | `notes`         | `{ "text": "…", "project"?: "name" }` → inbox                                                                                    |
| `POST /api/automation/trips`         | `trips`         | `{ "description": "Arbeit" }` – distance and type default to the last trip with that name; optional `kilometers`, `type`, `date` |
| `POST /api/automation/routines`      | `routines`      | `{ "title": "backups" }` – marks the best-matching active routine as done and reschedules it                                     |
| `POST /api/automation/actions`       | `actions`       | `{ "name": "deploy check" }` – runs the matching saved flow or action, returns status per step                                   |
| `POST /api/automation/notifications` | `notifications` | `{ "title", "message", "severity"?, "category"? }` → notification + Telegram                                                     |

Rate limit: 60 requests/minute per token.

**iOS Shortcut “Log trip to work”:** _Get Contents of URL_ → `https://<your-domain>/api/automation/trips`, method POST, header `Authorization: Bearer pd_…`, JSON body `description = Arbeit`. Add it to Siri.

## Extending

- **New data in global search:** add a provider in `server/services/search.ts`.
- **Alerts and data from other systems** (LUCY, automations, scripts): use the token-based Automation API above.
- **New module:** schema in `prisma/`, service in `server/services/`, zod contract in `lib/schemas/`, route in `app/api/`, view in `features/`, entry in `components/shell/nav.ts` (sidebar, mobile menu, command palette and shortcuts pick it up automatically).

## License

MIT – see `LICENSE`.
