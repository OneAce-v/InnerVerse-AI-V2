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

## Quick demo (no PostgreSQL or Firebase setup)

```bash
npm install
npm run demo
```

Then open the address it prints (<http://localhost:3000>, or the next free port if
another program is using 3000). `npm run demo` (`scripts/demo.ts`) starts the whole app
on one computer:

- **Database:** an embedded PostgreSQL ([PGlite](https://pglite.dev), the PostgreSQL
  engine compiled to WebAssembly) stored in `.demo-db/`. The app talks to it through
  the same `pg` driver and Drizzle schema as a normal PostgreSQL server; the test suite
  passes against both. To use your own PostgreSQL server instead, set `DEMO_DB=postgres`
  in `.env` along with the `SQL_*` values below.
- **Sign-in:** a local demo account, so no Firebase project is needed. The sidebar shows
  a "Demo mode" label.
- **Data:** the first run fills the account with three weeks of sample activity (see
  "Load demo data" below). What you log afterwards is kept between runs.

| Command | What it does |
|---|---|
| `npm run demo` | Start the demo, keeping whatever was logged last time |
| `npm run demo:fresh` | Wipe the demo account and re-seed it so the history ends today |

Optional `.env` values for the demo: `GEMINI_API_KEY` (without it the AI features use
their offline fallbacks) and `DEMO_NAME` (the display name, default "Demo User").

Demo mode is for demonstrations on your own machine only: it accepts the test sign-in
token described under [Testing](#testing), so the server listens on `localhost` only
in this mode. Deployments must use `npm run build` + `npm start`, where that sign-in is
disabled.

## Run it properly (real sign-in, your PostgreSQL, live Gemini)

1. **Firebase:** in the [Firebase console](https://console.firebase.google.com) create a project
   with a personal Google account, enable Authentication → Google, add a Web app, and copy its
   config values into `firebase-applet-config.json` (`apiKey`, `authDomain`, `projectId`, `appId`, ...).
   `localhost` is an authorized sign-in domain by default.
2. **Gemini:** create a key at <https://aistudio.google.com/apikey>.
3. **`.env`:** copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` and the `SQL_*` values
   (`SQL_ADMIN_*` can repeat them). Never commit `.env`.
4. **PostgreSQL:** create the database named in `SQL_DB_NAME` (for example `innerverse_dev`).
5. **Check everything:** `npm run doctor` tests each of the above and says what to fix.
6. **Create the tables, then start:** `npm run db:push`, then `npm run dev`.

If the app's port 3000 is taken, run it on another one: `$env:PORT=3001; npm run dev` (PowerShell).

### Forgot the `postgres` password (Windows)

Run these in an Administrator PowerShell; the PostgreSQL folder number (18 below) is your version.

1. `Stop-Service postgresql-x64-18`
2. Open `C:\Program Files\PostgreSQL\18\data\pg_hba.conf` in Notepad (as administrator) and, on the
   lines ending in `127.0.0.1/32` and `::1/128`, change `scram-sha-256` to `trust`. Save.
3. `Start-Service postgresql-x64-18`
4. `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "ALTER USER postgres PASSWORD 'choose-a-password'"`
   (use the port from `postgresql.conf`, the line `port = ...`).
5. Change the two lines back to `scram-sha-256`, save, and `Restart-Service postgresql-x64-18`.
6. Put the new password in `.env` as `SQL_PASSWORD` and `SQL_ADMIN_PASSWORD`.

Leaving `trust` in place lets any program on your computer connect without a password, so do step 5.

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
| `SQL_PORT` | Optional. Only needed when PostgreSQL is not on its default port, 5432 |
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

On Windows, if PostgreSQL was installed on the wrong port or you no longer know the
`postgres` password, `scripts/windows-postgres-setup.ps1` resets both (run it from an
Administrator PowerShell; it backs up the two config files it edits). The quick demo
above does not need this.

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

(`npm run demo` does this for its own demo account automatically; `--create` makes the
account as well, so nobody has to sign in first.)

The seeded meals, workouts, and journal entries are synthetic (logs are marked
`source = "demo-seed"`), but every Digital Twin state and snapshot is computed by the
app's own recalibration engine, replayed day by day over only the data that existed on
that day. Options: `--days <n>` (default 21) and `--use-ai` (recalibrate with Gemini
instead of the offline rule engine; slower and uses quota).

## Scripts

| Script | What it does |
|---|---|
| `npm run doctor` | Check `.env`, Firebase config, PostgreSQL, the Gemini key and the port, and say what to fix |
| `npm run demo` / `npm run demo:fresh` | One-command local demo with an embedded database and demo sign-in (see "Quick demo") |
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
(which `npm test` sets automatically, and `npm run demo` sets on purpose) — production
deployments run with `NODE_ENV=production` and never accept it. See `tests/global-setup.ts` for how the
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
- **Yoga & Meditation preferences are advisory.** They are saved on the profile and
  given to the AI coach as context; no Digital Twin score is computed from them.
- **Nutrition targets are fixed reference values** (2,200 kcal, 140 g protein, 250 g
  carbs, 70 g fat); they are not personalised yet.

The test suite (`tests/`) covers every API route, including a 401 check on all
protected routes and edge-case input validation (`tests/edge-cases.test.ts`).
