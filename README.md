# InnerVerse AI

A holistic health platform built around a "Digital Twin" — a 16-dimension model of a
user's physical, mental, and lifestyle state, kept in sync with tracked data and
recalibrated by AI. Includes tracking (nutrition/exercise/wearables), an AI coach,
journaling, gamification, and a set of "autonomous systems" dashboards
(orchestration, cognition, research, ecosystem, life OS).

## Stack

- **Frontend:** React 19, Vite 6, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Recharts
- **Backend:** Express, served from the same process as the Vite dev server / static build
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Firebase Authentication (Google sign-in), verified server-side with Firebase Admin
- **AI:** Google Gemini (`@google/genai`) for chat, recommendations, digital twin recalibration, food vision, and simulations

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key used for all AI features |
| `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` | Postgres connection used by the running app |
| `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` | Credentials `drizzle-kit` uses to push schema changes (can match the values above) |

Firebase Auth is configured separately via `firebase-applet-config.json` (client) and
the `firebase-admin` SDK's default credentials (server) — see `src/lib/firebase.ts`
and `src/lib/firebase-admin.ts`.

### 3. Set up the database

```bash
npm run db:push
```

Applies `src/db/schema.ts` to the Postgres database defined in your env vars.

### 4. Run the dev server

```bash
npm run dev
```

Starts an Express server (port `3000`) that also runs Vite in middleware mode, so
the frontend and API are served from one process during development.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the app in development (Express + Vite middleware, HMR on) |
| `npm run build` | Build the frontend (`vite build`) and bundle the server (`esbuild`) into `dist/` |
| `npm start` | Run the production build (`dist/server.cjs`) |
| `npm run preview` | Preview the built frontend via `vite preview` (frontend only, no API) |
| `npm run lint` | Type-check the whole project (`tsc --noEmit`) — there is no separate linter configured yet |
| `npm run db:push` | Push the Drizzle schema to Postgres |
| `npm test` | Run the integration test suite against a real Postgres database (see below) |
| `npm run clean` | Remove build output |

## Testing

`npm test` runs the real Express app (via `server.ts`) against whatever Postgres
database your `SQL_*` env vars point to — point it at a disposable database, not
production, since tests create real users and data. Steps:

```bash
npm run db:push   # once, to make sure the schema is current
npm test
```

Tests authenticate via a `TEST_AUTH:<uid>` bearer token instead of a real Firebase ID
token. That path in `src/middleware/auth.ts` only activates when `NODE_ENV=test`
(which `npm test` sets automatically) — production deployments run with
`NODE_ENV=production` and never accept it. See `tests/global-setup.ts` for how the
server is started for the test run, and `tests/helpers.ts` for the test-user/auth
helpers used across test files.

CI (`.github/workflows/ci.yml`) runs `npm run lint` and `npm test` against a
Postgres service container on every push and pull request.

## Project layout

```
server.ts                  Express app: all API routes, Gemini calls, request metrics
src/
  agents/                  Supervisor/specialist AI agent orchestration
  db/                      Drizzle schema, connection pool, digital twin service
  lib/                     Firebase client/admin setup, AI call metrics, utils
  middleware/               Auth middleware (Firebase ID token verification)
  components/
    Layout.tsx              App shell: grouped nav, mobile drawer, page transitions
    ErrorBoundary.tsx        Top-level and per-page error fallback
    ui/                      Shared primitives (PageHeader, SectionTabs, EmptyState, Skeleton, etc.)
    tracking/                Food/exercise logging, wearables, AI vision/motion modals
  pages/                    One file per route (Dashboard, DigitalTwin, Tracking, Settings, ...)
```

## Known gaps

Test coverage is intentionally narrow so far — it targets the server-authoritative
logic most worth protecting (quest reward idempotency, atomic store purchases, the
notifications IDOR fix, the journal date fallback) rather than every route. `server.ts`
itself is also still a single ~2,500-line file; splitting it into route modules is a
separate, not-yet-done piece of work.
