# Chatbot

A multi-provider AI chatbot built with Next.js, the AI SDK, and Drizzle ORM. Supports OpenAI, Anthropic, Google, xAI, and user-configured custom providers.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix UI primitives)
- **AI:** [AI SDK](https://ai-sdk.dev) v7 with streaming, tool use, and reasoning effort control
- **Database:** Postgres via [Drizzle ORM](https://orm.drizzle.team)
- **Cache:** Redis (optional — rate limiting and stream resumption)
- **Auth:** [Clerk](https://clerk.com) (hosted sign-in; chat requires a signed-in account)
- **Artifacts:** In-app code, spreadsheet, image, and text artifacts

## Prerequisites

- Node.js 20+
- `pnpm` 10.32.1 (`corepack enable`)
- Postgres (or Docker Compose)
- At least one AI provider API key (OpenAI, Anthropic, Google, or xAI)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk hosted sign-in/up page URLs |
| `ENCRYPTION_KEY` | Random secret for encrypting provider API keys (`openssl rand -base64 32`) |
| `POSTGRES_URL` | Postgres connection string |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` / `XAI_API_KEY` | At least one provider key |

Optional:

| Variable | Description |
|---|---|
| `REDIS_URL` | Enables rate limiting and stream resumption |
| `MAX_MESSAGES_PER_HOUR` | Rate limit for logged-in users (0 or unset = unlimited) |

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Start the dev server

```bash
pnpm dev
```

App runs at [localhost:3000](http://localhost:3000).

## Docker Compose

Runs the full stack (app + Postgres + Redis):

```bash
docker compose up
```

- App: `localhost:3001`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

Migrations run automatically on container start.

## Model Providers

Built-in providers are resolved via API keys in `.env.local`. Users can also add custom OpenAI-compatible providers at runtime through the settings UI — these are stored in Postgres and resolved dynamically.

Model capabilities (tools, vision, reasoning) are defined in the catalog at `lib/ai/catalog.ts`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server with Turbopack |
| `pnpm build` | Production build (includes type checking) |
| `pnpm check` | Lint (Ultracite/Biome) |
| `pnpm fix` | Auto-fix lint issues |
| `pnpm test` | Playwright e2e tests (sets `PLAYWRIGHT=True` for mock AI) |
| `pnpm db:migrate` | Run Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:generate` | Generate migration files |

## Testing

E2E tests use Playwright. The mock AI provider is activated via `PLAYWRIGHT=True`, so no real API keys are needed.

```bash
pnpm test
```

## Project Structure

```
app/(chat)/         # Chat UI and API routes
app/(auth)/auth.ts  # Session helper (Clerk-backed, mocked under Playwright)
lib/ai/             # Model catalog, providers, prompts, tools
lib/db/             # Drizzle schema, migrations, queries
lib/artifacts/      # Artifact rendering (code, sheet, image, text)
components/         # React components
artifacts/          # Server actions for artifact generation
tests/e2e/          # Playwright tests
```

## License

Apache 2.0 — © 2024 Vercel, Inc. · © 2026 Vilhelm Gain
