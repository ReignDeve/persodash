# PersoDash

PersoDash is a personal operations dashboard built with Next.js 16 and HeroUI. It aggregates on-chain insights, mining telemetry, Vercel project health, and notification utilities into a single, fast interface with protective authentication.

## Key Features
- **Miner observability** – Fetches worker metrics from Public Pool, highlights inactive workers, and surfaces hashrate trends for a dedicated miner view and the main dashboard.  Worker alerts can trigger internal notifications for follow-up automations.
- **Vercel project monitor** – Lists projects, domains, deployment status, and last production deploy time directly from the Vercel API to catch failing builds or offline sites quickly.
- **Wallet overview** – Shows a Phantom (Solana) portfolio, BTC mining wallet details, and Coinbase balances for quick treasury checks from the wallets page.
- **Notifications** – Optional Telegram bot delivery plus an internal `/api/notifications` endpoint to route miner incidents or daily summaries to your preferred channel.
- **Session guard** – Simple username/password login that issues an HttpOnly session cookie to keep the dashboard gated in personal environments.

## Tech Stack
- **Framework**: Next.js 16 (App Router, React Server Components) with TypeScript
- **UI**: HeroUI 2.x, Tailwind CSS 4, Framer Motion
- **Data & APIs**: Public Pool (BTC miners), Vercel REST API, Coinbase API, Moralis (Phantom portfolio), OnchainKit, Telegram Bot API

## Architecture
- **App routes** live under `app/`, split into dashboard sections (`/(dashboard)`) and auth (`/(auth)`), with shared providers in `app/providers.tsx`.
- **API routes** in `app/api/` proxy external services and normalize responses (e.g., `/api/vercel/projects`, `/api/coinbase/accounts`, `/api/public-pool/workers`).
- **Services** in `app/services/` encapsulate fetch logic, alert generation, and optional Telegram delivery.
- **Components** under `components/` deliver UI widgets for miner cards, wallet cards, charts, and layout primitives.

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Add environment variables** (see below) to `.env.local`.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` and log in with the credentials configured in `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.

## Environment Variables
Set the variables relevant to the integrations you use:

### Core
- `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD` – credentials for the session cookie login flow.
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` – public key for OnchainKit provider setup.

### Mining
- `BTC_ADDRESS` – mining wallet address tracked in dashboard and miner pages.
- `WORKER` – session/worker ID to highlight as the primary rig on dashboards.

### Web & Deployments
- `VERCEL_API_TOKEN` – Vercel personal or team token for project/deployment status.
- `VERCEL_TEAM_ID` – optional team ID when the token belongs to a team.

### Wallets & Portfolios
- `MORALIS_API_KEY` – required for the Phantom portfolio endpoint.
- `COINBASE_API_KEY_ID`, `COINBASE_API_KEY_SECRET` – Coinbase API credentials for balance queries.

### Notifications (optional)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` – enable Telegram notifications for miner alerts and summaries.

## Useful Scripts
- `npm run dev` – start the development server with Turbopack.
- `npm run build` – create an optimized production build.
- `npm run start` – serve the production build.
- `npm run lint` – run ESLint with auto-fix.
- `npm run gen:coinbase-jwt` – generate a JWT for Coinbase API authentication from the configured API keys.

## Project Layout
- `app/(dashboard)/page.tsx` – main dashboard with miner + website KPIs.
- `app/(dashboard)/miner/page.tsx` – detailed miner cards and hashrate chart.
- `app/(dashboard)/websites/page.tsx` – Vercel project/deployment status table.
- `app/(dashboard)/wallets/page.tsx` – aggregated crypto wallets and exchange balances.
- `app/api/*` – backend routes that talk to external APIs and normalize data for the UI.
- `components/` – reusable UI primitives (cards, charts, widgets) backing the dashboard pages.

## Security & Operations Notes
- The login mechanism is intentionally simple for personal use; consider NextAuth or signed tokens for multi-user or production deployments.
- API routes call external services with `cache: "no-store"` to always return fresh operational data.
- Miner alerting is extensible: failed fetches and inactive workers can be forwarded via Telegram or any downstream notifier consuming `/api/notifications`.

## License
This project is licensed under the MIT License. See `LICENSE` for details.
