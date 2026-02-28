# Contributing to AshbyHQ Job Scraper

Thanks for considering contributing. This project is a full-stack job tracker: a Node.js scraper for AshbyHQ job boards and a Next.js frontend backed by Neon PostgreSQL.

## Ways to Contribute

1. **Add companies** — Use the `/add` page or suggest new Ashby slugs to add to the registry.
2. **Fix bugs** — Report or fix issues in the scraper, frontend, or API.
3. **Improve scoring** — Tweak keyword weights, location/department boosts, or freshness rules in `src/config/rules.json` and `web/lib/scoring.ts`.
4. **Documentation** — Improve README, INTERVIEW_GUIDE, or code comments.
5. **Performance & reliability** — Optimize queries, caching, or Neon connection handling.

## Development Setup

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database (or local Postgres with the same schema)

### Backend (scraper)

```bash
npm install
cp .env.example .env
# Set DATABASE_URL in .env
node index.js run    # one scrape cycle
node index.js start # cron scheduler
```

### Frontend (web)

```bash
cd web
npm install
echo "DATABASE_URL=your_neon_url" > .env.local
npx next dev -p 3000
```

### Key paths

- **Backend:** `src/` (scheduler, fetch, normalize, store, diff, intelligence, notify)
- **Frontend:** `web/app/`, `web/components/`, `web/lib/`
- **Scoring rules:** `src/config/rules.json`, `web/lib/scoring.ts`
- **Company list:** `src/sources/registry.json` (curated); DB `companies` table (dynamically added via `/add`)

## How to Contribute

1. **Fork the repo** and clone your fork locally.

2. **Create a branch** for your change:
   ```bash
   git checkout -b fix/thing or feature/thing
   ```

3. **Make your changes.** Keep backend (CommonJS) and frontend (TypeScript) style consistent with the rest of the codebase.

4. **Test:**
   - Backend: `node index.js run` (and optionally `node index.js report`).
   - Frontend: `cd web && npx next dev` and click through feed, filters, applied/ignored, add company.

5. **Commit** with a clear message, e.g. `fix: connection timeout retry` or `feat: add company X to registry`.

6. **Push** and open a **Pull Request** against the main branch. Describe what you changed and why.

7. **Respond to review** if the maintainer asks for changes.

## Pull Request Guidelines

- One logical change per PR when possible.
- Don’t commit `.env` or secrets; use `.env.example` for required variables.
- If you add a new company via the registry, use the same JSON shape: `company`, `ashbySlug`, `enabled`, `frequencyHours`.

## Code of Conduct

Be respectful and constructive. This is a personal/open project; feedback and patches are welcome.
