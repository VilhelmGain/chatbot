This is a chatbot app with Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS v4, Drizzle ORM on Postgres, optional Redis, Clerk auth, and multi-provider AI via AI SDK.

## Developer constraints
- Do not run `pnpm build` or `pnpm test` after changes unless committing to `main`. Commits to `main` must be intentional. The remote tests the build.
- For local verification run `pnpm check` / `pnpm fix` only.

## Package manager
- `pnpm@10.32.1` only (`packageManager` pinned). Do not use npm or yarn.

## Commands
- `pnpm install`
- `pnpm db:migrate` — apply Drizzle migrations from `lib/db/migrations`. Reads `.env.local` via `dotenv`. Exits silently if `POSTGRES_URL` unset.
- `pnpm dev` — Next.js with Turbopack on `http://localhost:3000`.
- `pnpm dev:demo` — `DEMO_MODE=1` next dev. Zero deps: in-memory DB, mock AI, auto-signed-in `demo@example.com`. Ephemeral, per-instance. Refuses to start in production unless `ALLOW_DEMO_IN_PROD=1` is also set.
- `pnpm build` — production build. Type checking happens inside the build, no separate `tsc` script.
- `pnpm check` / `pnpm fix` — lint and format via Ultracite (Biome). Pre-commit hook is `husky` + `lint-staged` running `pnpm run fix --` on staged `*.{ts,tsx,js,jsx,jsonc}`.
- `pnpm test` — `export PLAYWRIGHT=True && pnpm exec playwright test`. Playwright starts `pnpm dev` itself and waits on `/ping`. Also usable: `PLAYWRIGHT_TEST_BASE_URL` or `CI_PLAYWRIGHT` trigger the same test mode.
- DB helpers: `db:generate`, `db:studio`, `db:push`, `db:pull`, `db:check` (all via `drizzle-kit`, also read `.env.local`).

## Environment
- Copy `.env.example` to `.env.local`. `drizzle.config.ts`, `lib/db/migrate.ts`, and `playwright.config.ts` all load `.env.local`.
- Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `ENCRYPTION_KEY` (`openssl rand -base64 32`), `POSTGRES_URL`.
- Optional: `REDIS_URL` (enables rate limiting and resumable streams), `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `NEXT_PUBLIC_APP_URL`.
- `DEMO_MODE=1` bypasses Clerk and DB entirely. Never set in production unless you intend a public demo. `PLAYWRIGHT*` flags are ignored in production (`lib/constants.ts:13`).

## Database
- Schema: `lib/db/schema.ts`. Migrations: `lib/db/migrations`.
- `migrate.ts` uses `postgres` with `max: 1` and `drizzle-orm/postgres-js/migrator`.

## Architecture
- Chat UI is rendered by `app/(chat)/layout.tsx`; `app/(chat)/page.tsx` and `app/(chat)/chat/[id]/page.tsx` return `null`. `ChatShellWrapper` and `ActiveChatProvider` are the real entrypoints.
- Auth helper `app/(auth)/auth.ts:25` — Clerk in prod, mock cookie `test-user` email in `isTestEnvironment`. `middleware.ts:23` bypasses Clerk entirely when `isTestEnvironment` is true; otherwise `clerkMiddleware` protects `/`, `/chat/:id`, `/settings`, `/api/:path*`. `/ping` always returns `pong`.
- `isTestEnvironment` (`lib/constants.ts:13`) is true when `DEMO_MODE=1` outside production (or with `ALLOW_DEMO_IN_PROD=1`) or when any of `PLAYWRIGHT` / `PLAYWRIGHT_TEST_BASE_URL` / `CI_PLAYWRIGHT` is set outside production.
- API routes under `app/(chat)/api/`. Tools under `lib/ai/tools/`, artifacts under `artifacts/`.
- Providers: `lib/ai/providers.ts` merges env keys with encrypted `CustomProvider` rows (stored in Postgres). Model catalog: `lib/ai/catalog.ts` wraps `@opencode-ai/models` snapshot + live fetch from `models.dev` (5s timeout, 5m live TTL, 1h persisted sync). Capabilities mapped in `mapModelCapabilities`. Mock provider for tests is `lib/ai/models.mock.ts`.

## Docker
- `docker compose up` — app `localhost:3001`, Postgres `localhost:5433`, Redis `localhost:6380`. `docker-entrypoint.sh` runs migrations before start.

## Testing
- E2E lives in `tests/e2e/`, config in `playwright.config.ts:25`. `PLAYWRIGHT=True` enables mock AI and mock auth (no Clerk or provider keys needed). `webServer` is `pnpm dev` with `reuseExistingServer: !CI`, health check `baseURL + /ping`. CI runs only `e2e` (Chromium) project in `e2e.yml`; `firefox`, `webkit`, `mobile-chrome` available locally.
- Some model-selector tests reference DeepSeek/Kimi which may not be in the default snapshot; they depend on live catalog discovery.

## Tooling quirks
- Path alias `@/*` maps to `./*` (`tsconfig.json:22`).
- `biome.jsonc` extends `ultracite/biome/*` and excludes `components/ui` and `lib/db/migrations`.
- `next.config.ts:55` is `output: "standalone"`, `reactCompiler: true`, `cacheComponents: true`, plus `turbopackFileSystemCacheForDev` and `optimizePackageImports` for `framer-motion`, `shiki`, `streamdown`. `instrumentation.ts` is a no-op.
