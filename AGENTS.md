This is a chatbot application built with Next.js, TypeScript, Tailwind CSS, and Drizzle ORM. It uses a Postgres database and optionally Redis for rate limiting and stream resumption. The application supports multiple AI providers and models, which can be managed through a catalog system.

## Instructions from developer
- do not run `build` after you are done with code changes. the code will be tested when commited to the repository. the build is only necessary if you are committing to the main branch. however, if you are committing to the main branch make sure it is intentional.
- in the same way build should not be run, avoid running `test` as well.

## Package manager
- Use `pnpm` only. `packageManager` is pinned to `pnpm@10.32.1`.
- Do not use npm or yarn.

## Daily commands
- `pnpm install`
- `pnpm db:migrate` — run before dev to apply Drizzle migrations (`lib/db/migrations`). Loads `.env.local`.
- `pnpm dev` — Next.js dev server with Turbopack on port 3000.
- `pnpm build` — production build. TypeScript checking happens during the build; there is no separate `tsc` script.
- `pnpm check` / `pnpm fix` — lint and format via Ultracite (Biome). Pre-commit runs `pnpm exec lint-staged`, which runs `pnpm run fix --` on staged files.
- `pnpm test` — Playwright e2e tests. Sets `PLAYWRIGHT=True` so the app uses the mock AI provider (`lib/ai/models.mock.ts`) AND bypasses Clerk entirely (mock test-mode auth, no Clerk keys needed). Playwright starts the dev server automatically and waits on `/ping`.

## Environment
- Copy `.env.example` to `.env.local`.
- Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `ENCRYPTION_KEY`, `POSTGRES_URL`.
- Optional: `REDIS_URL` (rate limiting / stream resumption), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`.
- Drizzle Kit, the migrate script, and Playwright all read `.env.local` via `dotenv`.

## Database
- Schema: `lib/db/schema.ts`.
- Migrations folder: `lib/db/migrations`.
- Useful scripts: `db:generate`, `db:migrate`, `db:studio`, `db:push`, `db:pull`, `db:check`.
- `pnpm db:migrate` runs `lib/db/migrate.ts`, which exits silently if `POSTGRES_URL` is unset.

## Architecture
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4.
- Chat UI is rendered by `app/(chat)/layout.tsx`; `app/(chat)/page.tsx` and `app/(chat)/chat/[id]/page.tsx` return `null`.
- Auth is Clerk. `app/(auth)/auth.ts` exposes a `auth()` session helper backed by `@clerk/nextjs/server`. Under `PLAYWRIGHT=True` it switches to mock test-mode auth driven by a `test-user` cookie (no Clerk keys needed for tests). Middleware (`middleware.ts`) handles `/ping` and protects all other routes with Clerk in production, but is bypassed in test mode.
- API routes are under `app/(chat)/api/`.
- Model list and discovery: `lib/ai/models.ts`. Provider resolution: `lib/ai/providers.ts`. Custom providers are stored in Postgres and resolved at runtime.

## Docker
- `docker compose up` runs the full stack: app on `localhost:3001`, Postgres on `localhost:5433`, Redis on `localhost:6380`.
- The container image runs migrations automatically via `docker-entrypoint.sh` before starting the app.

## Testing notes
- E2E tests live in `tests/e2e/`. Playwright config starts `pnpm dev` and loads `.env.local`.
- `PLAYWRIGHT=True` triggers the mock AI provider, so chat/API tests do not need real provider keys. It also switches auth to mock test-mode (a `test-user` cookie), so no Clerk keys are needed for tests.
- Some model-selector tests reference models (DeepSeek, Kimi) that are not in the default `lib/ai/models.ts` list; they rely on provider discovery or may be stale.

## Tooling quirks
- Path alias `@/*` maps to `./*`.
- `biome.jsonc` extends `ultracite/biome/*` presets and excludes generated/vendored files (`components/ui`, `components/elements`, etc.).
- `next.config.ts` uses `output: "standalone"`, `reactCompiler: true`, and several experimental flags.
- `instrumentation.ts` is a no-op (telemetry disabled for self-hosting).
