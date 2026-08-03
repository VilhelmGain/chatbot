# Custom Provider Configuration System

## Overview

Add per-user custom LLM provider support. Users can configure OpenAI-compatible or Anthropic-compatible endpoints with custom base URLs and API keys, manage models, and use them in chat. Settings page at `/settings` inside the `(chat)` route group.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider scope | Per-user | Each regular user manages their own providers |
| Guest access | No | Only regular (non-guest) users can add providers |
| Model discovery (OpenAI) | Auto-detect via `GET /v1/models` | Standard endpoint for OpenAI-compatible APIs |
| Model discovery (Anthropic) | Test connection + manual entry | No standard model listing API exists |
| Custom model ID format | `custom-{providerUUID}/{modelName}` | Globally unique, avoids collisions with built-in models |
| API key storage | AES-256-GCM encrypted at rest | Key derived from `AUTH_SECRET` via SHA-256 |
| Provider resolution | Async with in-memory cache (5min TTL) | Avoids DB hit on every request |
| Settings page location | `/settings` inside `(chat)` group | Shares sidebar layout |

---

## Implementation Steps

### Step 1: Database Schema

**File: `lib/db/schema.ts`**

Add two new tables:

```typescript
export const customProvider = pgTable("CustomProvider", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { enum: ["openai", "anthropic"] }).notNull(),
  baseURL: varchar("baseURL", { length: 512 }).notNull(),
  encryptedApiKey: text("encryptedApiKey").notNull(),
  iv: varchar("iv", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const customModel = pgTable("CustomModel", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  providerId: uuid("providerId").notNull().references(() => customProvider.id, { onDelete: "cascade" }),
  modelId: varchar("modelId", { length: 256 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  capabilities: json("capabilities").notNull(), // { tools: boolean, vision: boolean, reasoning: boolean }
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
```

Generate migration: `npm run db:generate`

### Step 2: Encryption Utility

**New file: `lib/ai/encryption.ts`**

- `encrypt(plaintext: string): { encrypted: string; iv: string }` - AES-256-GCM
- `decrypt(encrypted: string, iv: string): string`
- Derive 256-bit key from `AUTH_SECRET` using `crypto.createHash('sha256')`
- Return encrypted as base64, IV as hex

### Step 3: Database Queries

**File: `lib/db/queries.ts`** - add functions:

| Function | Purpose |
|----------|---------|
| `getCustomProvidersByUserId(userId)` | List user's providers (without decrypted API key) |
| `getCustomProviderById(id)` | Single provider with encrypted key |
| `createCustomProvider({ userId, name, type, baseURL, apiKey })` | Encrypt key, insert row |
| `updateCustomProvider(id, { name, baseURL, apiKey? })` | Update fields, re-encrypt key if changed |
| `deleteCustomProvider(id, userId)` | Delete with ownership check |
| `getCustomModelsByProviderId(providerId)` | List models for a provider |
| `createCustomModel({ providerId, modelId, name, capabilities })` | Add a model |
| `createCustomModels(providerId, models[])` | Bulk add models (for auto-detect) |
| `deleteCustomModel(id, providerId)` | Remove a model |
| `getCustomProviderByModelId(customProviderId)` | Look up provider when resolving a custom model |

### Step 4: Provider Factory Update

**File: `lib/ai/providers.ts`**

Changes:
1. Make `resolveModel()` async
2. Make `getLanguageModel()` async
3. Add custom provider resolution with in-memory cache

```typescript
// In-memory cache: providerId -> { config, expiresAt }
const providerCache = new Map<string, { config: CustomProviderConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveModel(modelId: string) {
  const [providerName, ...rest] = modelId.split("/");
  const modelName = rest.join("/");

  if (providerName.startsWith("custom-")) {
    const providerId = providerName.slice(7); // remove "custom-"
    return resolveCustomProvider(providerId, modelName);
  }

  // existing switch cases...
}

async function resolveCustomProvider(providerId: string, modelName: string) {
  const cached = providerCache.get(providerId);
  if (cached && cached.expiresAt > Date.now()) {
    return createModelFromConfig(cached.config, modelName);
  }

  const provider = await getCustomProviderByModelId(providerId);
  if (!provider) throw new Error(`Custom provider not found: ${providerId}`);

  const apiKey = decrypt(provider.encryptedApiKey, provider.iv);
  const config = { type: provider.type, baseURL: provider.baseURL, apiKey };

  providerCache.set(providerId, { config, expiresAt: Date.now() + CACHE_TTL_MS });
  return createModelFromConfig(config, modelName);
}

function createModelFromConfig(config: CustomProviderConfig, modelName: string) {
  if (config.type === "openai") {
    return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }).languageModel(modelName);
  }
  if (config.type === "anthropic") {
    return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL }).languageModel(modelName);
  }
  throw new Error(`Unknown custom provider type: ${config.type}`);
}
```

4. `getTitleModel()` remains synchronous (always uses built-in model)

### Step 5: Update All Call Sites for Async `getLanguageModel()`

All call sites must `await getLanguageModel(modelId)`:

| File | Change |
|------|--------|
| `app/(chat)/api/chat/route.ts:~256` | `model: await getLanguageModel(chatModel)` |
| `artifacts/text/server.ts:15,36` | `model: await getLanguageModel(modelId)` |
| `artifacts/code/server.ts` | Same pattern |
| `artifacts/sheet/server.ts` | Same pattern |
| `lib/ai/tools/request-suggestions.ts:45` | `model: await getLanguageModel(modelId)` |

### Step 6: Model Registry Update

**File: `lib/ai/models.ts`**

- Change `allowedModelIds` from a static `Set` to a function: `async isAllowedModelId(modelId: string): Promise<boolean>`
  - Returns true for built-in models (static Set check)
  - For `custom-*` models: checks if the custom provider exists in DB
- Add `getCustomModelsForUser(userId)` that returns `ChatModel[]` for the user's custom providers
- Keep `getCapabilities()` returning static capabilities; add `getCustomCapabilities(userId)` that merges custom model capabilities

### Step 7: Chat Route Update

**File: `app/(chat)/api/chat/route.ts`**

Replace the static `allowedModelIds.has()` check (line 89) with:

```typescript
const isAllowed = await isAllowedModelId(selectedChatModel);
const chatModel = isAllowed ? selectedChatModel : DEFAULT_CHAT_MODEL;
```

For custom models, also verify ownership:

```typescript
if (selectedChatModel.startsWith("custom-")) {
  const providerId = selectedChatModel.split("/")[0].slice(7);
  const provider = await getCustomProviderById(providerId);
  if (!provider || provider.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }
}
```

### Step 8: Models API Update

**File: `app/(chat)/api/models/route.ts`**

- Make GET handler async and user-aware
- Return both built-in capabilities/models AND user's custom models/capabilities
- Remove 24h cache for custom models (use short cache or no cache)

```typescript
export async function GET() {
  const session = await auth();
  const builtinCapabilities = getCapabilities();
  const builtinModels = chatModels;

  if (!session?.user || session.user.type === "guest") {
    return Response.json({ capabilities: builtinCapabilities, models: builtinModels });
  }

  const customModels = await getCustomModelsForUser(session.user.id);
  const customCapabilities = getCustomCapabilitiesMap(customModels);

  return Response.json({
    capabilities: { ...builtinCapabilities, ...customCapabilities },
    models: [...builtinModels, ...customModels],
  }, { headers: { "Cache-Control": "no-cache" } });
}
```

### Step 9: Settings API Routes

**New files under `app/(chat)/api/settings/providers/`:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/settings/providers` | GET | List user's custom providers (no API keys) |
| `/api/settings/providers` | POST | Create a new provider |
| `/api/settings/providers/[id]` | GET | Get single provider details |
| `/api/settings/providers/[id]` | PUT | Update provider |
| `/api/settings/providers/[id]` | DELETE | Delete provider |
| `/api/settings/providers/[id]/test` | POST | Test connection to provider endpoint |
| `/api/settings/providers/[id]/models` | GET | List models for provider |
| `/api/settings/providers/[id]/models` | POST | Add model(s) to provider |
| `/api/settings/providers/[id]/models/[modelId]` | DELETE | Remove a model |
| `/api/settings/providers/[id]/detect` | POST | Auto-detect models (OpenAI-compatible only) |

All routes:
- Require `session.user` and `session.user.type === "regular"`
- Verify provider ownership for `[id]` routes
- Use Zod for request validation

**Test connection logic:**
- OpenAI-compatible: `GET {baseURL}/v1/models` with `Authorization: Bearer {apiKey}`
- Anthropic-compatible: `POST {baseURL}/v1/messages` with minimal test payload

**Auto-detect logic (OpenAI-compatible):**
- Call `GET {baseURL}/v1/models`
- Parse response, extract model IDs
- Default capabilities: `{ tools: true, vision: false, reasoning: false }`
- Store all detected models in bulk

### Step 10: Error Surface Extension

**File: `lib/errors.ts`**

Add `"provider"` to the `Surface` type and add error codes:
- `bad_request:provider` - invalid provider configuration
- `not_found:provider` - provider not found
- `forbidden:provider` - provider belongs to another user

### Step 11: Settings Page UI

**New file: `app/(chat)/settings/page.tsx`**

Page structure:
- Header: "Settings" with back button
- Section: "Custom Providers"
  - List of existing providers (cards)
  - "Add Provider" button -> form dialog

**New file: `components/settings/provider-card.tsx`**
- Shows provider name, type, baseURL (masked API key)
- Edit / Delete / Test Connection buttons
- Expandable model list section

**New file: `components/settings/provider-form.tsx`**
- Dialog/sheet form for creating/editing a provider
- Fields: name, type (select: openai/anthropic), baseURL, apiKey (password input)
- "Test Connection" button
- On success (OpenAI type): offer to auto-detect models

**New file: `components/settings/model-manager.tsx`**
- Lists models for a provider
- "Add Model" form (manual entry: model ID, name, capabilities checkboxes)
- "Auto-detect" button (OpenAI type only)
- Delete button per model

**New file: `components/settings/add-model-form.tsx`**
- Inline form for manual model entry
- Fields: model ID, display name, capabilities (tools/vision/reasoning checkboxes)

### Step 12: Sidebar Navigation Update

**File: `components/chat/sidebar-user-nav.tsx`**

Add a "Settings" link in the user dropdown menu (visible only for regular users, not guests).

### Step 13: Middleware Update

**File: `middleware.ts`**

Add `/settings` to the matcher. The existing auth flow handles it (redirects guests to auto-login, regular users pass through). No additional middleware changes needed since the API routes handle authorization.

### Step 14: UI Model Selector Update

**File: `components/chat/multimodal-input.tsx`**

The `ModelSelectorCompact` already merges curated + dynamic models from `/api/models`. Since Step 8 adds custom models to the API response, the selector will automatically show them.

Additional changes:
- Custom models should NOT be shown as "locked" - they're fully available
- Update the grouping logic: custom models grouped under their provider name
- Custom provider names come from the model's `provider` field (set to the provider's display name)

### Step 15: SWR Cache Invalidation

The model selector uses SWR with 1h deduplication. After adding/removing a custom provider or model, we need to revalidate:

```typescript
mutate(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`);
```

Call this after any provider/model CRUD operation in the settings page.

---

## File Summary

### New Files (12)
| File | Purpose |
|------|---------|
| `lib/ai/encryption.ts` | API key encryption/decryption |
| `app/(chat)/settings/page.tsx` | Settings page |
| `app/(chat)/api/settings/providers/route.ts` | Provider CRUD |
| `app/(chat)/api/settings/providers/[id]/route.ts` | Single provider operations |
| `app/(chat)/api/settings/providers/[id]/test/route.ts` | Test connection |
| `app/(chat)/api/settings/providers/[id]/models/route.ts` | Model CRUD |
| `app/(chat)/api/settings/providers/[id]/models/[modelId]/route.ts` | Single model delete |
| `app/(chat)/api/settings/providers/[id]/detect/route.ts` | Auto-detect models |
| `components/settings/provider-card.tsx` | Provider card component |
| `components/settings/provider-form.tsx` | Provider create/edit form |
| `components/settings/model-manager.tsx` | Model list + add form |
| `components/settings/add-model-form.tsx` | Manual model entry form |

### Modified Files (9)
| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add CustomProvider + CustomModel tables |
| `lib/db/queries.ts` | Add 10 CRUD functions |
| `lib/ai/providers.ts` | Async resolution + custom provider support |
| `lib/ai/models.ts` | Dynamic `isAllowedModelId()`, `getCustomModelsForUser()` |
| `lib/errors.ts` | Add `provider` surface + error codes |
| `app/(chat)/api/chat/route.ts` | Async model check + ownership verification |
| `app/(chat)/api/models/route.ts` | Include custom models in response |
| `artifacts/{text,code,sheet}/server.ts` | `await getLanguageModel()` |
| `lib/ai/tools/request-suggestions.ts` | `await getLanguageModel()` |
| `components/chat/sidebar-user-nav.tsx` | Add Settings link |
| `middleware.ts` | Add `/settings` to matcher |

---

## Verification

1. **Schema migration**: `npm run db:generate && npm run db:migrate`
2. **Type check**: `npm run typecheck` (or `npx tsc --noEmit`)
3. **Lint**: `npm run lint`
4. **Manual testing**:
   - Create a custom OpenAI-compatible provider (e.g., point to a local Ollama instance)
   - Auto-detect models
   - Select a custom model in the chat model selector
   - Send a message and verify it works
   - Test Anthropic-compatible provider with manual model entry
   - Verify guest users cannot access settings
   - Verify provider ownership (user A can't use user B's provider)
5. **Existing tests**: `npm test` (Playwright E2E)
