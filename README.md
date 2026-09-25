# Technical Test — Frontend

Next.js 16 (App Router) + React 19 client for the Fullstack Engineer assessment. Talks to the
separate Bun/Hono API (see `../backend`) entirely client-side via Axios + TanStack Query — there
is no Next.js-side database, so this app is built as an authenticated SPA shell rather than
using Server Components/Server Actions for data (see `src/app/providers.tsx` and the client
components under `src/app/dashboard`).

## Stack

Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui (Radix primitives),
TanStack Query 5, Axios, Zustand 5 (persisted auth store), React Hook Form + Zod, Biome, Husky,
Commitlint.

## Getting started

```bash
bun install
cp .env.example .env.local   # NEXT_PUBLIC_BE_URL, defaults to http://localhost:8000
bun run dev                  # http://localhost:3000, requires the backend running
```

Sign in with any of the backend's seeded accounts (see `../backend/README.md`), password
`password123` for all of them.

## Architecture overview

- **Auth**: JWT returned by `POST /auth/login` is held in a Zustand store persisted to
  `localStorage` (`src/stores/auth-store.ts`). An Axios request interceptor
  (`src/lib/api-client.ts`) attaches it as `Authorization: Bearer <token>`; a response
  interceptor clears the session and redirects to `/login` on `401`.
- **Route protection**: `src/app/dashboard/layout.tsx` is a client-side guard — it waits for the
  persisted store to rehydrate, then redirects to `/login` if there's no token. Combined with the
  backend rejecting every unauthenticated/unauthorized request, this satisfies "guarded routes on
  both the API and the UI."
- **Data fetching**: every resource goes through TanStack Query hooks (`src/hooks/*`) calling
  typed functions in `src/lib/api/*`, which JSON-encode `filters`/`searchFilters`/`rangedFilters`
  per the standard query contract before attaching them as query params.
- **Role-based UI**: `src/app/dashboard/page.tsx` renders `TaskBoard` (PM/Internal) or
  `ClientProjectView` (Client Guest) based on the logged-in user's role — mirroring, not
  replacing, the backend's own scoping. The Client Guest response never contains
  `assignee`/`department`/internal comments in the first place (masked server-side), so there is
  nothing sensitive for this branch to accidentally leak.
- **State-based UI locks**: `src/components/dashboard/task-card.tsx#getActionState` mirrors the
  backend's status-transition rules (dependency block, department/assignee match, the
  PM-cannot-complete carve-out) to disable the action button client-side with an explanatory
  `title`. The backend re-validates all of it independently — this is UX, not the security
  boundary.
- **PM authoring flow**: `create-project-dialog.tsx` / `create-task-dialog.tsx` (member and
  dependency pickers populated from `GET /users` and the current project's tasks) and
  `task-detail-dialog.tsx` (edit core fields, comments, link attachments, audit history, soft
  delete) — everything a PM needs to run a project without touching the API directly.
- **Cache scoped to the logged-in session**: the TanStack `QueryClient` is a singleton
  (`src/lib/query-client.ts`) explicitly `.clear()`ed on login, logout, and `401`, so switching
  accounts in one browser tab never shows a stale, previous-user's cached response.

## Testing

```bash
bun run test        # vitest run
```

Vitest + React Testing Library (`vitest.config.mts`), jsdom environment. Covers
`TaskCard` (`src/components/dashboard/task-card.test.tsx`) — the same state-based
permission logic the backend enforces, exercised through the rendered component: the
assignee can start an unblocked task in their own department; the Start/Complete button is
disabled (with the right `title`) when blocked by a dependency, when the viewer is in the
wrong department, or when a PM tries the In-Progress→Done transition only an executor may
make; a Done task renders no action button; and clicking the action button never also
triggers the card's open-detail click (event propagation).

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: Biome format+lint, `tsc`
typecheck, the Vitest suite above, then `next build`.

## Scripts

`bun run dev` · `bun run build` · `bun run test` · `bun run typecheck` ·
`bun run lint` / `lint:fix`

## Not yet implemented

- Binary attachment upload UI (backend is link-based — see `../backend/README.md`).
- Daily Standup Auto-Summary view (backend endpoint is optional/bonus and not built either).
