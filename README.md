# AshbyHQ Job Scraper

A production-grade system that scrapes public AshbyHQ job listings across 53+ companies, persists them in Neon PostgreSQL, tracks changes over time, and surfaces actionable opportunities through a Next.js frontend with intelligent scoring.

## Features

- **53+ Companies** — OpenAI, Notion, Ramp, Deel, Snowflake, Cursor, Harvey, Cohere, and more
- **Automated Scraping** — Polls Ashby's public job board API on a configurable cron schedule
- **Change Detection** — Tracks new, updated, and removed postings via content hashing
- **Intelligent Scoring** — Ranks jobs by keyword relevance, location, remote preference, department, and freshness
- **Cloud Database** — Neon PostgreSQL with connection pooling (queryable from anywhere)
- **Web Frontend** — Next.js 16 App Router with filtering, pagination, and apply/ignore tracking
- **Stealth-Aware** — Jittered scheduling, randomized delays, browser-like headers
- **Reports** — CLI summaries and daily Markdown reports with apply links

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Backend (Node.js)                                           │
│                                                             │
│ Scheduler ─→ Registry ─→ Fetch ─→ Normalize ─→ PostgreSQL  │
│                                      │                      │
│                               Diff Engine                   │
│                                      │                      │
│                           Intelligence ─→ Notifications     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        Neon PostgreSQL
                               │
┌──────────────────────────────┴──────────────────────────────┐
│ Frontend (Next.js)                                          │
│                                                             │
│ Server Components ─→ PostgreSQL queries ─→ Scored job feed  │
│ API Routes ─→ Filter / paginate / update status             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Backend (Scraper)

```bash
# Install dependencies
npm install

# Configure environment (set DATABASE_URL to your Neon connection string)
cp .env.example .env

# Run a single scrape cycle
node index.js run

# Start the scheduled scraper
node index.js start
```

### Frontend (Web UI)

```bash
cd web
npm install

# Configure environment
echo "DATABASE_URL=your_neon_connection_string" > .env.local

# Start the dev server
npx next dev -p 3000
```

## Commands

| Command | Description |
|---|---|
| `node index.js run` | Run a single scrape cycle across all due companies |
| `node index.js start` | Start the cron-based scheduler |
| `node index.js report` | Generate a Markdown report from existing data |
| `node index.js add <slug>` | Add a company to the source registry |

## Configuration

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `CRON_SCHEDULE` — Cron expression for scrape frequency (default: every 12h)
- `MIN_RELEVANCE_SCORE` — Minimum score threshold for surfaced jobs
- `LOG_LEVEL` — Logging verbosity (debug/info/warn/error)

Intelligence rules (keyword weights, preferred locations, etc.) are in `src/config/rules.json`.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js (CommonJS) |
| Database | Neon PostgreSQL (connection pooling, SSL) |
| HTTP client | Axios with exponential backoff |
| Scheduling | node-cron with jitter |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| CLI | Commander with chalk output |

## Project Structure

```
├── index.js                CLI entry point
├── src/
│   ├── config/             Environment + rules.json
│   ├── scheduler/          Cron + pipeline orchestration
│   ├── sources/            Company registry (53+ companies)
│   ├── fetch/              Axios client with retries + stealth headers
│   ├── normalize/          Schema mapping + content hashing
│   ├── store/              PostgreSQL persistence (async pg)
│   ├── diff/               Change detection (NEW/UPDATED/REMOVED)
│   ├── intelligence/       Multi-signal scoring engine
│   ├── notify/             CLI output + Markdown reports
│   └── utils/              Logger, hash, delay helpers
├── web/
│   ├── app/                Next.js pages (feed, detail, applied, ignored)
│   ├── components/         UI components (filters, job list, pagination)
│   └── lib/                Database queries, scoring, types
├── reports/                Generated Markdown reports
└── INTERVIEW_GUIDE.md      End-to-end project walkthrough
```
