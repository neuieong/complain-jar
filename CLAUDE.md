# Complain Jar

A digital take on the swear jar — every complaint costs money that goes into a jar to be spent later on something nice (e.g. a dinner out). Built as a web app first, with iOS/Android as the end goal.

## The concept

- One or more people share a jar
- Each complaint logged adds a fixed amount (default $1) to the jar's running total
- When ready, you "bust" the jar — clear it and go spend the accumulated amount together
- No real money moves yet; this is a prototype tracking dummy amounts

## Current status

Functional prototype. All data lives in `localStorage`. No auth, no backend, no real payments. The UI is mobile-first and intentionally sized like a phone screen (`max-w-sm` centered).

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
| Storage | `localStorage` abstracted behind `StorageAdapter` interface | |

### Backend (`server/`)
| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js + TypeScript | CommonJS, compiled with `tsc`, dev via `tsx watch` |
| Framework | Express 4 | Battle-tested, wide ecosystem |
| ORM | Prisma 5 | TypeScript-first, handles migrations |
| Database | PostgreSQL | Relational; maps cleanly to Jar/Complaint/User domain |
| Auth | JWT (jsonwebtoken) | Stateless — works for web and future React Native without changes |
| Passwords | bcryptjs | Cost factor 12 |

**Node**: installed via Homebrew at `/opt/homebrew/bin/node`. If `node`/`npm` aren't on PATH, prefix commands with `export PATH="/opt/homebrew/bin:$PATH"`.

## Project structure

```
src/                          — Frontend (React)
  types/index.ts              — all domain types + StorageAdapter interface
  services/storage.ts         — localStorage implementation of StorageAdapter + helpers
  store/jarStore.ts           — Zustand store (init, addComplaint, bustJar, stats)
  components/
    JarVisual.tsx             — animated SVG jar that fills as complaints accumulate
    AddComplaintModal.tsx     — bottom-sheet modal for adding a complaint + note
    BottomNav.tsx             — fixed bottom navigation (Home / History / Settings)
    ComplaintCard.tsx         — single row in the history list
  pages/
    Home.tsx                  — jar view, stats, add + bust CTAs
    History.tsx               — chronological complaint log
    BustJar.tsx               — confirmation + celebration flow for emptying the jar
    Settings.tsx              — rename jar, pick amount per complaint
  App.tsx                     — BrowserRouter + route definitions + store init
  main.tsx                    — React root
  index.css                   — single `@import "tailwindcss"` line

server/                       — Backend (Express + Prisma)
  prisma/
    schema.prisma             — DB schema: User, Jar, JarMember, Complaint
  src/
    index.ts                  — Express app entry + route mounting (port 3001)
    lib/prisma.ts             — singleton PrismaClient
    middleware/auth.ts        — JWT requireAuth middleware + signToken helper
    routes/
      auth.ts                 — POST /api/auth/register, /api/auth/login
      jars.ts                 — CRUD + bust + member invite for /api/jars
      complaints.ts           — GET + POST for /api/jars/:jarId/complaints
  .env.example                — copy to .env and fill in DATABASE_URL + JWT_SECRET
```

## Key design decisions

### Data model (scalability-first)

All core types live in `src/types/index.ts`. They are intentionally over-specified for a prototype because changing them later means a data migration:

- `Complaint` has `jarId` + `userId` — ready for group jars and multi-user
- `Jar` has `memberIds[]` — group jars are just jars with more members
- Amounts are stored in **cents (integers)** — avoids floating-point issues when real money is involved
- `Jar` has a `currency` field (ISO 4217) — internationalization ready
- `Jar.bustedAt` is set (not deleted) when a jar is emptied — keeps history for future audit/stats features

### Storage abstraction

`src/services/storage.ts` exports a `localStorageAdapter` that satisfies the `StorageAdapter` interface defined in `src/types/index.ts`. **All data access goes through this adapter — never call `localStorage` directly from components or the store.** When a real backend is added, only this file needs to change.

### State management

The Zustand store (`jarStore.ts`) is the single source of truth for UI state. It calls the storage adapter and holds the hydrated `jar` and `complaints` arrays. `init()` must be called once on mount (done in `App.tsx`). The `stats()` method is a derived selector — call it as `useJarStore(s => s.stats)()`.

### Mobile-first layout

The app shell constrains width to `max-w-sm` and uses a fixed bottom nav — intentionally mimicking a mobile app. This is deliberate: the eventual target is React Native, and keeping the layout simple and phone-shaped makes the visual transition easier.

## Planned future features (not built yet)

These are known goals — design with them in mind but don't implement prematurely:

1. **Partner/friend invite** — a second user can join a jar (data model already supports `memberIds[]`)
2. **Group jars** — multiple people sharing one jar (same as above)
3. **Real payments** — when a complaint is added, real money moves (Stripe or similar); the `amountPerComplaint` in cents maps directly to a payment amount
4. **Auth** — login so jars persist across devices; `userId` is already on every `Complaint`
5. **Push notifications** — "your partner just complained again"
6. **React Native port** — Zustand store and service layer are framework-agnostic and can be reused directly; only the component layer needs replacing (Tailwind → NativeWind or StyleSheet)

## Known bugs (unfixed)

### Low priority / latent
- **`bustedAt` semantics are ambiguous** (`src/store/jarStore.ts:57`) — `bustedAt` means "was busted at some point", not "is currently empty". It is never cleared when a new cycle begins. If bust history is ever tracked, this needs a separate `busts[]` log on the jar rather than a single timestamp field.

## Known issues to address before real payments

These are acceptable for the prototype but **must** be resolved before real money is involved:

- **No validation on deserialized localStorage data** — `JSON.parse(raw) as T` is a TypeScript cast, not a runtime check. Malformed or schema-mismatched data silently produces wrong types. Fix: validate with Zod or similar at the storage boundary.
- **`currency` not snapshotted per complaint** — `Complaint` has no `currency` field; it's always read from the parent `Jar`. If the jar's currency ever changes, historical totals display incorrectly. Fix: add `currency: string` to the `Complaint` type and populate it at complaint creation time.
- **`generateId()` is not collision-safe** (`src/services/storage.ts:98`) — `Date.now() + Math.random()` is fine for solo local use but not for multi-user or synced scenarios. Fix: replace with `crypto.randomUUID()`.
- **No schema versioning** — No version marker on stored data. Schema changes will silently break old data. Fix: add a `schemaVersion` field to `Jar` and `Complaint`, and write a migration in `bootstrapStorage`.
- **`currency` passed unvalidated to `Intl.NumberFormat`** (`src/services/storage.ts:91`) — An invalid ISO 4217 code throws a `RangeError`. Currently safe because only preset values are used, but needs a guard before currency becomes user-editable or API-sourced.

## Common commands

### Frontend
```bash
npm run dev       # start dev server (http://localhost:5173)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # serve the production build locally
```

### Backend (run from `server/`)
```bash
npm install               # install dependencies
cp .env.example .env      # then fill in DATABASE_URL + JWT_SECRET + CORS_ORIGIN
npm run db:migrate        # apply Prisma migrations (creates tables)
npm run db:generate       # regenerate Prisma client after schema changes
npm run dev               # start server with hot reload (http://localhost:3001)
npm run build             # compile to dist/
npm start                 # run compiled server
npm test                  # run tests (Vitest + Supertest, no DB required)
npm run db:studio         # open Prisma Studio (visual DB browser)
```

### API endpoints
```
POST   /api/auth/register               — create account
POST   /api/auth/login                  — get token

POST   /api/jars                        — create jar
GET    /api/jars/:id                    — get jar
PUT    /api/jars/:id                    — update name / amountPerComplaint
POST   /api/jars/:id/bust               — clear complaints + stamp bustedAt
POST   /api/jars/:id/members            — add member (owner only)

GET    /api/jars/:jarId/complaints      — list complaints (newest first)
POST   /api/jars/:jarId/complaints      — add complaint

GET    /api/health                      — liveness check
```
All `/api/jars` and `/api/jars/:jarId/complaints` routes require `Authorization: Bearer <token>`.
