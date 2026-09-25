# NodeWave Project Tracker (frontend)

<div align="justify">

Frontend for the NodeWave project tracker, written for the NodeWave Fullstack Engineer technical test. Product Managers and Internal Team members work on a task board, and Client Guests get a read-only progress view of the tasks shared with them. The app calls the REST API in [nodewave-project-tracker-backend](https://github.com/shiinobu/nodewave-project-tracker-backend) from the browser. Every page is a client component, there are no Server Actions or route handlers, and the app has no database of its own.

## Stack

- Next.js 16 (App Router), React 19, React Compiler enabled
- TypeScript (strict), Tailwind CSS 4, shadcn/ui (Radix)
- TanStack Query 5 and Axios for API calls, Zustand 5 for the session
- React Hook Form and Zod 4 for forms
- Vitest and Testing Library
- Biome, Husky, commitlint

## Requirements

- Bun 1.4.2 (`packageManager` in `package.json`, same version in CI)
- Node.js 20.9 or later (Next.js requirement)
- The backend running at `NEXT_PUBLIC_BE_URL`, with a migrated and seeded database. Setup is in its README. Its `CORS_ORIGIN` must match this app's origin (the backend default is `http://localhost:3000`).

## Getting started

```bash
bun install
cp .env.example .env.local
bun run dev
```

The dev server listens on http://localhost:3000. `bun run build` needs network access because `next/font/google` downloads Manrope, Sora and IBM Plex Mono at build time. Sign in with one of the seeded accounts below, all with the password `password123`.

```text
pm@nodewave.id          Product Manager
uiux@nodewave.id        Internal Team, UI/UX
frontend@nodewave.id    Internal Team, Frontend
backend@nodewave.id     Internal Team, Backend
client@nodewave.id      Client Guest
```

`/register` only offers Internal Team and Client Guest, because the API refuses PM sign-ups without an invite code and the form has no field for one. A new account sees no projects until a PM adds it to one.

## Environment variables

```env
NEXT_PUBLIC_BE_URL=http://localhost:8000
```

Backend origin. `src/lib/api-client.ts` appends `/api`, so leave it out. There is no fallback in the code, so the variable has to be set. Next.js inlines `NEXT_PUBLIC_*` values at build time, so changing the URL means rebuilding.

## Project structure

```text
nodewave-project-tracker-frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/             layout.tsx guards the route, page.tsx picks the view by role
│   │   ├── login/                 login form
│   │   ├── register/              registration form
│   │   ├── layout.tsx             fonts, metadata, Providers
│   │   ├── page.tsx               redirects to /dashboard or /login
│   │   └── providers.tsx          QueryClientProvider and toaster
│   ├── components/
│   │   ├── dashboard/             board, task card, dialogs, Client Guest view, topbar
│   │   └── ui/                    shadcn/ui components (not covered by Biome)
│   ├── hooks/                     TanStack Query hooks for projects, tasks and users
│   ├── lib/
│   │   ├── api/                   one module per resource: auth, projects, tasks, users
│   │   ├── api-client.ts          Axios instance, interceptors, error helpers
│   │   ├── client-summary.ts      progress sentence and activity feed for Client Guests
│   │   ├── department-styles.ts   colours per department
│   │   ├── query-client.ts        shared QueryClient
│   │   ├── time.ts                relative time and day labels
│   │   └── utils.ts               cn, getInitials, isSafeUrl
│   ├── stores/
│   │   └── auth-store.ts          token and user, persisted to localStorage
│   └── types/
│       └── index.ts               API types
├── .github/workflows/ci.yml       CI
├── .env.example                   NEXT_PUBLIC_BE_URL
├── next.config.ts                 React Compiler enabled
└── vitest.config.mts              jsdom, src/**/*.test.{ts,tsx}
```

## Architecture

```text
component
  ↓
src/hooks/*              TanStack Query: cache, loading and error state
  ↓
src/lib/api/*            one function per endpoint
  ↓
src/lib/api-client.ts    Axios: base URL, JWT header, 401 handling
  ↓
backend                  NEXT_PUBLIC_BE_URL/api
```

Projects, tasks and users go through hooks, while login, register and logout call `src/lib/api/auth.ts` directly, from the login and register pages and `src/components/dashboard/topbar.tsx`. `listTasks` (`src/lib/api/tasks.ts`) JSON-encodes `filters` and `searchFilters` into query params, and the UI only uses the `projectId` filter and `rows`.

### Session

`POST /auth/login` returns `{ token, user }`, and `src/stores/auth-store.ts` keeps both in a Zustand store persisted to `localStorage` under `auth-storage`. A request interceptor in `src/lib/api-client.ts` sends the token as `Authorization: Bearer <token>`, and on a `401` the response interceptor clears the store and the query cache and sends the browser to `/login`. `src/app/dashboard/layout.tsx` guards `/dashboard` by redirecting to `/login` when there is no token once the store has rehydrated, and `src/app/page.tsx` does the same to choose between `/dashboard` and `/login`. Both checks run in the browser, and the API enforces access to data.

### Cache

`src/lib/query-client.ts` exports a single `QueryClient` (`staleTime` 30 s, one retry). It is a module-level singleton so the 401 interceptor can clear it, and it is also cleared on login, register and logout so a new session never shows the previous user's data. Task lists, single tasks and audit logs all sit under the `['tasks']` key, and mutations in `src/hooks/use-tasks.ts` invalidate that whole prefix so the board, an open task dialog and its history refresh together. Comments and attachments only invalidate that task's detail and history.

### Concurrent edits

Tasks carry a `version`. Status changes, edits and deletes send the version they were based on, and the API answers `409` if the task has changed since. On a `409`, `src/hooks/use-tasks.ts` shows the error toast and refetches `['tasks']`, so the next attempt uses the current version. `isConflictError` in `src/lib/api-client.ts` detects the status.

### Roles

`src/app/dashboard/page.tsx` renders `ClientProjectView` for Client Guests and `TaskBoard` for everyone else. A PM creates projects (with members) and tasks (department, assignee, dependencies, client visibility), edits or deletes a task in the detail dialog, and can share a comment with the client. Internal Team members use the same board to start and complete tasks in their own department, add comments (always internal) and attachment links, and read the task history. Client Guests are read-only. The Start/Complete button on a card (`getActionState` in `src/components/dashboard/task-card.tsx`) is disabled, with the reason as a tooltip, when the task is blocked by a dependency (Start only), the viewer's department differs from the task's, the task is assigned to someone else, or a PM tries to complete it. The API validates every transition itself, so these checks are hints, not enforcement.

### Client Guest view

The API returns a masked task to Client Guests, without `department`, assignee or internal comments. That is why `department` and `assignee` are optional in `src/types/index.ts`, and why the board narrows tasks to `InternalTask` (`src/components/dashboard/task-card.tsx`) and skips any without a department. `ClientProjectView` takes progress (`percentComplete`, `totalTasks`, `completedTasks`) from the project summary, which counts every task in the project, while the task list only has the tasks shared with the client. The Activity tab is built in the browser from those tasks by `src/lib/client-summary.ts`, and no event carries an actor.

## Testing

```bash
bun run test
```

Vitest with jsdom and Testing Library (`vitest.config.mts`, `vitest.setup.ts`), with test files next to the code as `src/**/*.test.{ts,tsx}`. API calls are mocked, so the backend is not needed. The suites cover:

- `src/components/dashboard/task-card.test.tsx`: when Start/Complete is enabled or disabled per role, department, assignee and blocked state; no button on Done tasks; click and keyboard handling (Enter and Space on the button run the action without opening the detail).
- `src/hooks/use-tasks.test.tsx`: a save refetches the board, the open task and its history; a `409` on update or delete refetches the task; other errors do not refetch.
- `src/lib/client-summary.test.ts`, `src/lib/time.test.ts`: progress sentence, activity feed (newest first, no actor, limit), day grouping and labels.

## Scripts

```bash
bun run dev          # next dev
bun run build        # next build
bun run start        # next start, needs a prior build
bun run test         # vitest run
bun run typecheck    # tsc --noEmit
bun run lint         # biome check
bun run lint:fix     # biome check --write
bun run format       # biome format --write
```

Husky installs two git hooks through the `prepare` script: `pre-commit` runs `bun run lint` and `bun run typecheck`, and `commit-msg` runs commitlint with `@commitlint/config-conventional`.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on every pull request. It is one job on `ubuntu-latest` with Bun 1.4.2 and `NEXT_PUBLIC_BE_URL=http://localhost:8000`, has no deployment step, and runs these steps in order:

1. `bun install --frozen-lockfile`
2. `bun run lint`
3. `bun run typecheck`
4. `bun run test`
5. `bun run build`

## Known limitations

- Attachments are links (file name and URL). Files cannot be uploaded.
- The board and the Client Guest view request at most 100 tasks per project (`rows: 100`) and have no pagination, search or filter controls. The project list is capped at 50 and the user list at 200 (`src/lib/api/projects.ts`, `src/lib/api/users.ts`).
- Dependencies can only be set when a task is created. `addDependency` (with `useAddDependency`) and `deleteProject` exist in the API layer, but no screen uses them. The backend has no endpoint to edit a project or its members.
- Logout is client-side. `POST /auth/logout` returns a message and does not invalidate the JWT, which stays valid until it expires.
- No daily standup summary view.

</div>
