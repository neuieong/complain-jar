# Complain Jar

A digital take on the swear jar — every complaint costs money that goes into a jar to be spent later on something nice (e.g. a dinner out). Built as a web app first, with iOS/Android as the end goal.

## The concept

- One or more people share a jar
- Each complaint logged adds a fixed amount (default $1) to the jar's running total
- When ready, you "bust" the jar — clear it and go spend the accumulated amount together
- No real money moves yet; this is a prototype tracking dummy amounts

## Current status

Full-stack prototype **fully deployed and live end-to-end**. The frontend (Vercel) talks to the Express backend (Railway) which reads/writes to Neon PostgreSQL. The frontend uses an **async `StorageAdapter` interface** that can be backed by either `localStorage` (offline/demo mode) or the Express HTTP API (real mode). Mode is toggled via `VITE_API_URL` — if set, the app shows a login screen and reads/writes to Neon; if unset, it falls back to localStorage with no auth required.

A **CrewAI analysis feature** is built and working locally: three agents (Categorizer, Sentiment Analyst, Summarizer) process the jar's complaints and return a short insights report displayed on the History page. The Python/FastAPI service runs separately alongside Express. It is not yet deployed — it only works when running locally.

**Demo credentials:** `demo@complainjar.dev` / `password123` — jar pre-seeded with 25 realistic complaints.

## Tech stack

### Frontend
| Layer | Choice | Notes |
|---|---|---|
| Bundler | Vite 8 | `npm run dev` starts on port 5173 |
| UI framework | React 19 + TypeScript | Strict mode enabled |
| Styling | Tailwind CSS v4 | Configured via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed |
| State | Zustand 5 | Single store: `src/store/jarStore.ts` |
| Routing | React Router v7 | `BrowserRouter` with four routes |
| Icons | Lucide React | |
| Storage | Async `StorageAdapter` interface | Backed by `localStorageAdapter` or `createHttpAdapter` depending on `VITE_API_URL` |
| Tests | Vitest + jsdom | 62 tests across auth service + HTTP adapter |

### Backend (`server/`)
| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + TypeScript | CommonJS, compiled with `tsc`, dev via `tsx watch` |
| Framework | Express 4 | Battle-tested, wide ecosystem |
| ORM | Prisma 5 | TypeScript-first, handles migrations |
| Database | PostgreSQL (Neon) | Serverless Postgres; schema applied via `prisma db push` |
| Auth | JWT (jsonwebtoken) | Stateless — works for web and future React Native without changes |
| Passwords | bcryptjs | Cost factor 12 |
| Tests | Vitest + Supertest | Auth + jars + complaints routes tested without a real DB |

### Analysis service (`analysis-service/`)
| Layer | Choice | Notes |
|---|---|---|
| Runtime | Python 3.11 + venv | Isolated from the Node stack |
| Framework | FastAPI + Uvicorn | Single endpoint: `POST /analyze` |
| AI orchestration | CrewAI 1.14 | Three sequential agents |
| LLM backend | OpenAI API (GPT-4o) | Key stored in `analysis-service/.env` — never committed |

**Node**: installed via Homebrew at `/opt/homebrew/bin/node`. If `node`/`npm` aren't on PATH, prefix commands with `export PATH="/opt/homebrew/bin:$PATH"`.

## Project structure

```
src/                          — Frontend (React)
  types/index.ts              — all domain types + async StorageAdapter interface
  services/
    storage.ts                — localStorage implementation of StorageAdapter + helpers
    auth.ts                   — JWT token storage, login(), register(), AuthError
    auth.test.ts              — Vitest tests for auth service (TDD)
    httpAdapter.ts            — HTTP implementation of StorageAdapter + ensureJar bootstrap
    httpAdapter.test.ts       — Vitest tests for HTTP adapter (TDD)
  store/jarStore.ts           — Zustand store; init(adapter, jarId) is injectable
  components/
    JarVisual.tsx             — animated SVG jar that fills as complaints accumulate
    AddComplaintModal.tsx     — bottom-sheet modal for adding a complaint + note
    BottomNav.tsx             — fixed bottom navigation (Home / History / Settings)
    ComplaintCard.tsx         — single row in the history list
    AuthGate.tsx              — renders Auth page if no token; children otherwise
  pages/
    Home.tsx                  — jar view, stats, add + bust CTAs
    History.tsx               — complaint log + Analyse button + CrewAI results panel
    BustJar.tsx               — confirmation + celebration flow for emptying the jar
    Settings.tsx              — rename jar, pick amount per complaint
    Auth.tsx                  — login / register form (HTTP mode only)
  App.tsx                     — adapter selection, AuthGate wiring, bootstrap logic
  main.tsx                    — React root
  index.css                   — single `@import "tailwindcss"` line

server/                       — Backend (Express + Prisma)
  prisma/
    schema.prisma             — DB schema: User, Jar, JarMember, Complaint
    seed.ts                   — seeds demo user + jar + 25 complaints (idempotent)
  src/
    app.ts                    — Express app setup (exported separately for testability)
    index.ts                  — imports app + calls listen (nothing else)
    lib/prisma.ts             — singleton PrismaClient
    middleware/
      auth.ts                 — JWT requireAuth middleware + signToken helper
      error.ts                — global error handler (hides stack traces in production)
    routes/
      auth.ts                 — POST /api/auth/register, /api/auth/login
      auth.test.ts            — Vitest + Supertest tests (no DB required)
      jars.ts                 — CRUD + bust + member invite + GET list for /api/jars
      jars.test.ts            — authorization boundary + transaction tests
      complaints.ts           — GET + POST for /api/jars/:jarId/complaints
      complaints.test.ts      — member guard + amount snapshot tests
      analyze.ts              — POST /api/jars/:id/analyze — proxies to Python service
  vitest.config.ts            — Vitest config (Node environment)
  .env.example                — copy to .env and fill in DATABASE_URL + JWT_SECRET + CORS_ORIGIN

analysis-service/             — CrewAI Python microservice
  crew.py                     — Three-agent crew: Categorizer → Sentiment → Summarizer
  main.py                     — FastAPI app; POST /analyze + GET /health
  requirements.txt            — pinned Python dependencies
  .env.example                — copy to .env and fill in OPENAI_API_KEY
  .venv/                      — Python virtual environment (gitignored)
```

## Key design decisions

### Async StorageAdapter interface

The `StorageAdapter` interface in `src/types/index.ts` has **all methods returning `Promise<T>`**. This means the localStorage adapter (which is synchronous) wraps values in `Promise.resolve()`, and the HTTP adapter uses `fetch()` — but all callers (`jarStore`, components) are identical either way. Swapping backends is a one-line change in `App.tsx`.

`clearComplaints` was replaced by `bustJar(jarId): Promise<Jar>`. The localStorage adapter does it as two steps internally; the HTTP adapter maps it to a single atomic `POST /api/jars/:id/bust` on the server. The store never needs to know the difference.

### Injectable adapter in the store

`jarStore.init(adapter, jarId)` accepts the adapter as a parameter rather than importing it directly. This makes the store fully testable in isolation — pass in a mock adapter, no `localStorage` or network required. It also makes the HTTP/localStorage toggle a pure `App.tsx` concern.

### ensureJar bootstrap (HTTP mode)

On login, `ensureJar()` in `httpAdapter.ts` runs this sequence:
1. Try `localStorage.getItem('cj:activeJarId')` — fast path for returning users
2. If stale/missing, call `GET /api/jars` to list existing jars — picks the most recently created
3. Only if the user has no jars at all, create one via `POST /api/jars`

A module-level promise dedup prevents React StrictMode's double-effect invocation from creating two jars simultaneously.

### CrewAI pipeline

Three sequential agents, each with a focused role:
- **Categorizer** — groups complaints into named themes (Traffic, Work, Tech, etc.)
- **Sentiment Analyst** — scores emotional tone per category, flags strongest language
- **Summarizer** — produces a 150–200 word human-readable report with top themes, mood check, standout quote, and a light observation

Express proxies to the Python service so the frontend never calls Python directly — auth and jar membership are still enforced at the Express layer before any analysis runs.

### Data model (scalability-first)

- `Complaint` has `jarId` + `userId` — ready for group jars and multi-user
- `Jar` has `memberIds[]` — group jars are just jars with more members
- Amounts are stored in **cents (integers)** — avoids floating-point issues when real money is involved
- `Jar` has a `currency` field (ISO 4217) — internationalization ready
- `Jar.bustedAt` is set (not deleted) when a jar is emptied — keeps history for future audit/stats features

### Backend architecture

The Express app is split: `app.ts` exports the configured app; `index.ts` calls `app.listen()`. This separation makes Supertest integration tests work without starting a real server.

API response shapes are serialized via `serializeJar` / `serializeComplaint` to exactly match the frontend `StorageAdapter` types — responses pass straight to the store without mapping.

### Mobile-first layout

`max-w-sm` shell + fixed bottom nav mimics a mobile app intentionally. The eventual target is React Native; keeping the layout phone-shaped makes the visual transition easier. The Zustand store and service layer are already framework-agnostic.

## Deployment status

| Service | Status | URL |
|---|---|---|
| Frontend (React) | ✅ Deployed | https://complain-jar.vercel.app |
| Database (Neon) | ✅ Live | Neon PostgreSQL, schema applied |
| Backend (Express) | ✅ Deployed | https://complain-jar-production.up.railway.app |
| Analysis (Python/CrewAI) | ✅ Deployed | https://imaginative-integrity-production-cbee.up.railway.app |

**Railway notes:**
- Build command: `cd server && npm install && npx prisma generate && npm run build`
- Start command: `cd server && npm start`
- Required env variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- Public networking port must match what Railway assigns as `PORT` (check deploy logs for `Server running on http://localhost:XXXX`)

**Analysis service Railway notes:**
- Root directory must be set to `analysis-service` in Railway service settings
- Required env variables: `OPENAI_API_KEY`, `CORS_ORIGIN` (set to the Express Railway URL)
- Express service requires `ANALYSIS_SERVICE_URL` pointing to the Python service (include `https://` — Railway's copy button omits it)

## Recently fixed bugs

- **`BustJar` missing await** — `bustJar()` was not awaited; UI showed success before backend confirmed. Fixed: `handleBust` is now async, awaits the action, and disables the button during the request.
- **`History` invalid Bearer header** — sent `Authorization: Bearer ` (empty token) instead of omitting the header when unauthenticated. Fixed: header is only set when a token exists.
- **`crew.py` wrong jar total** — told the AI "Total amount in jar: $5.00" when there were 5 complaints (used `len()` as a dollar value). Fixed: line removed entirely since complaint amounts aren't passed to the analysis service.
- **`bootstrapHttp` dead code** — exported function that immediately threw; superseded by `ensureJar`. Fixed: deleted.
- **`Prisma.JarGetPayload` type** — `JarWithMembers` used a generic TypeScript syntax Railway's compiler rejected. Fixed: replaced with the proper Prisma utility type.
- **`prisma generate` missing from build** — Railway build compiled TypeScript but never generated the Prisma client, causing a startup crash. Fixed: added `npx prisma generate` to `railway.json` build command.

## Known bugs (minor, unfixed)

- **React StrictMode double calls** — `getJar` + `getComplaints` are called twice on mount in dev (StrictMode fires effects twice). Harmless; the dedup only covers `ensureJar`, not the store's `init`.
- **`GET /api/jars` picks newest jar** — ordered by `createdAt desc`; if a user accumulates multiple jars, they always land on the most recently created one. Fine for single-jar use, but needs a "select active jar" concept for multi-jar support.
- **Analysis service CORS** — hardcoded to `http://localhost:3001`. Needs updating when the Python service is deployed.
- **`bustedAt` semantics are ambiguous** — means "was busted at some point", not "is currently empty". Never cleared when a new cycle begins. Needs a `busts[]` log if bust history is tracked.

## Known issues to address before real payments

- **No validation on deserialized localStorage data** — `JSON.parse(raw) as T` is a TypeScript cast, not a runtime check. Fix: validate with Zod at the storage boundary.
- **`currency` not snapshotted per complaint** — always read from the parent `Jar`. Fix: add `currency` to `Complaint` and populate at creation time.
- **`generateId()` is not collision-safe** — `Date.now() + Math.random()` fine for local solo use. Fix: replace with `crypto.randomUUID()`.
- **No schema versioning** on localStorage data. Fix: add `schemaVersion` field + migration in `bootstrapStorage`.
- **`currency` passed unvalidated to `Intl.NumberFormat`** — invalid ISO 4217 throws `RangeError`. Safe currently (preset values only), but needs a guard before currency is user-editable.

## Running locally (all three services)

```bash
# Terminal 1 — Frontend
npm run dev                   # http://localhost:5173

# Terminal 2 — Backend
cd server && npm run dev       # http://localhost:3001

# Terminal 3 — Analysis service
cd analysis-service
.venv/bin/uvicorn main:app --reload --port 8000
```

The frontend reads `VITE_API_URL` from `.env` at the project root. If it's set to `http://localhost:3001`, the app runs in HTTP mode (login screen, Neon data). Remove or unset it to fall back to localStorage mode.

**Demo login:** `demo@complainjar.dev` / `password123`

### Frontend
```bash
npm run dev       # start dev server
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm test          # Vitest (62 tests, no network required)
```

### Backend (run from `server/`)
```bash
npm install               # install dependencies
cp .env.example .env      # fill in DATABASE_URL + JWT_SECRET + CORS_ORIGIN
npx prisma generate       # generate Prisma client from schema
npx prisma db push        # apply schema to Neon
npm run dev               # start with hot reload (http://localhost:3001)
npm test                  # run tests (no DB required)
npx tsx prisma/seed.ts    # seed demo user + 25 complaints (idempotent)
```

### Analysis service (run from `analysis-service/`)
```bash
cp .env.example .env                          # fill in OPENAI_API_KEY
.venv/bin/pip install -r requirements.txt     # install dependencies
.venv/bin/uvicorn main:app --reload --port 8000
```

> **Neon + migrations note:** `prisma migrate dev` requires a shadow database Neon's free tier doesn't support. Use `prisma db push` for schema changes during development.

## API endpoints

```
POST   /api/auth/register               — create account
POST   /api/auth/login                  — get token

GET    /api/jars                        — list user's jars (newest first)
POST   /api/jars                        — create jar
GET    /api/jars/:id                    — get jar
PUT    /api/jars/:id                    — update name / amountPerComplaint
POST   /api/jars/:id/bust               — clear complaints + stamp bustedAt
POST   /api/jars/:id/members            — add member (owner only)
POST   /api/jars/:id/analyze            — run CrewAI analysis on jar's complaints

GET    /api/jars/:jarId/complaints      — list complaints (newest first)
POST   /api/jars/:jarId/complaints      — add complaint

GET    /api/health                      — liveness check
```

All `/api/jars` routes require `Authorization: Bearer <token>`.

## What to work on next

### High priority
1. **Runtime validation on localStorage data** — `JSON.parse(raw) as T` is a TypeScript cast with no runtime check; add Zod validation at the storage boundary before any real data is stored
2. **Partner/friend invite UI** — backend + data model already exist (`POST /api/jars/:id/members`, `JarMember` table); needs an invite flow in the UI

### Medium priority
3. **Snapshot `currency` per complaint** — currently always read from the parent `Jar`; if currency changes, old complaints show the wrong symbol
4. **Replace `generateId()` in localStorage adapter** — `Date.now() + Math.random()` is not collision-safe; replace with `crypto.randomUUID()`

### Longer term
6. **Group jars** — data model supports it; needs a "select active jar" UI concept and multi-member flows
7. **Real payments** — `amountPerComplaint` stored in cents maps directly to a Stripe payment intent amount
8. **Push notifications** — "your partner just complained again"
9. **React Native port** — Zustand store and service layer are already framework-agnostic; only the component layer needs replacing
