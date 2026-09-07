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
| `npm run clean` | Remove build output |

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

This project has no automated tests and no CI workflow yet — `npm run lint`
(the type-checker) is the only automated check today. A few features are also
still UI-only / mocked rather than backed by real data or a real transaction;
these are being tracked and closed out incrementally.
