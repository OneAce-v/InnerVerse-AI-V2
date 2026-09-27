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

Applies `src/db/schema.ts` to the Postgres database defined in your env vars. Re-run it
after pulling schema changes (for example, the `profiles.preferences` column).

### 4. Run the dev server

```bash
npm run dev
```

Starts an Express server (port `3000`) that also runs Vite in middleware mode, so
the frontend and API are served from one process during development.

### 5. (Optional) Load demo data

A brand-new account has no history, so trends, streaks and the Cognition page look
empty. To fill an account with three weeks of realistic activity:

1. Sign in to the app once with the Google account you'll demo with.
2. Run:

```bash
npm run seed:demo -- you@gmail.com            # add --reset to replace existing activity
```

The seeded meals, workouts, and journal entries are synthetic (logs are marked
`source = "demo-seed"`), but every Digital Twin state and snapshot is computed by the
app's own recalibration engine, replayed day by day over only the data that existed on
that day. Options: `--days <n>` (default 21) and `--use-ai` (recalibrate with Gemini
instead of the offline rule engine; slower and uses quota).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the app in development (Express + Vite middleware, HMR on) |
| `npm run build` | Build the frontend (`vite build`) and bundle the server (`esbuild`) into `dist/` |
| `npm start` | Run the production build (`dist/server.cjs`) |
| `npm run preview` | Preview the built frontend via `vite preview` (frontend only, no API) |
| `npm run lint` | Type-check the whole project (`tsc --noEmit`) — there is no separate linter configured yet |
| `npm run db:push` | Push the Drizzle schema to Postgres |
| `npm run seed:demo -- <email>` | Fill a signed-in account with demo history (see step 5 above) |
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
server.ts                  Express bootstrap: middleware, rate limits, router mounts
src/
  routes/                  One file per feature area (profile, tracking, digitalTwin,
                            gamification, store, orchestration, ecosystem, cognition, ...)
                            - each exports an express.Router() mounted in server.ts
  agents/                  Supervisor/specialist AI agent orchestration
  db/                      Drizzle schema, connection pool, digital twin service
  lib/                     Gemini client + retry, reward/store catalogs, request
                            metrics, Firebase client/admin setup, misc server helpers
  middleware/               Auth middleware (Firebase ID token verification)
  components/
    Layout.tsx              App shell: grouped nav, mobile drawer, page transitions
    ErrorBoundary.tsx        Top-level and per-page error fallback
    ui/                      Shared primitives (PageHeader, SectionTabs, EmptyState, Skeleton, etc.)
    tracking/                Food/exercise logging, wearables, AI vision/motion modals
  pages/                    One file per route (Dashboard, DigitalTwin, Tracking, Settings, ...)
```

## Known gaps

- **AI features need a real `GEMINI_API_KEY`.** Without one, chat, journal mood
  analysis, recommendations, and Digital Twin recalibration fall back to rule-based
  heuristics (chat tells the user it is offline; the twin records
  `rule-engine-fallback` in its metadata). The what-if simulation, decision engine,
  Magic Log, and camera food scanner return an "unavailable" error instead of
  invented results.
- **Billing is a demo.** No payment provider is connected; choosing a plan records a
  simulated payment (status `demo`) and does not gate any features.
- **No reminders or push notifications.** Only in-app notifications exist (twin
  recalibration, subscription changes).
- **No pose estimation.** Motion tracking is a manual logging form.

The test suite (`tests/`) covers every API route, including a 401 check on all
protected routes and edge-case input validation (`tests/edge-cases.test.ts`).
