export const DEFAULT_CHAT_MODEL = "openai/gpt-4o";

export const titleModel = {
  description: "Fast model for title generation",
  id: "openai/gpt-4o-mini",
  name: "GPT-4o Mini",
  provider: "openai",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    description: "OpenAI GPT-4o",
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
  },
  {
    description: "OpenAI GPT-4o Mini (fast)",
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
  },
  {
    description: "Anthropic Claude Sonnet 4",
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
  },
  {
    description: "Google Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
  },
  {
    description: "xAI Grok 4.1 Fast",
    id: "xai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    provider: "xai",
  },
];

const staticCapabilities: Record<string, ModelCapabilities> = {
  "anthropic/claude-sonnet-4-20250514": {
    reasoning: false,
    tools: true,
    vision: true,
  },
  "google/gemini-2.5-flash": { reasoning: true, tools: true, vision: true },
  "openai/gpt-4o": { reasoning: false, tools: true, vision: true },
  "openai/gpt-4o-mini": { reasoning: false, tools: true, vision: true },
  "xai/grok-4.1-fast": { reasoning: false, tools: true, vision: false },
};

const PROVIDER_ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
};

function isValidApiKey(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[*x\-_]+$/.test(trimmed)) {
    return false;
  }
  if (
    trimmed.toLowerCase().includes("your-") ||
    trimmed.toLowerCase().includes("example")
  ) {
    return false;
  }
  return true;
}

export function getConfiguredProviders(): Set<string> {
  const configured = new Set<string>();
  for (const [provider, envKey] of Object.entries(PROVIDER_ENV_KEYS)) {
    if (isValidApiKey(process.env[envKey])) {
      configured.add(provider);
    }
  }
  return configured;
}

export function getAvailableBuiltinModels(): ChatModel[] {
  const configured = getConfiguredProviders();
  return chatModels.filter((m) => configured.has(m.provider));
}

export function getCapabilities(): Record<string, ModelCapabilities> {
  return staticCapabilities;
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export async function isAllowedModelId(modelId: string): Promise<boolean> {
  if (allowedModelIds.has(modelId)) {
    return true;
  }

  if (modelId.startsWith("custom-")) {
    const { getCustomModelsByProviderId } = await import("../db/queries");
    const [providerPart] = modelId.split("/");
    const providerId = providerPart.slice(7);
    const models = await getCustomModelsByProviderId({ providerId });
    const modelName = modelId.split("/").slice(1).join("/");
    return models.some((m) => m.modelId === modelName);
  }

  return false;
}

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

export function getModelAvailability(_modelId: string): ModelAvailability {
  return "healthy";
}

function inferCapabilities(modelId: string): ModelCapabilities {
  const [, name] = modelId.split("/");
  const lower = name.toLowerCase();
  const isReasoning =
    /^o[1-9]/.test(name) ||
    lower.includes("reasoning") ||
    lower.includes("thinking") ||
    lower.includes("deepseek-r1") ||
    lower.includes("qwq");
  const isVision =
    lower.includes("4o") ||
    lower.includes("vision") ||
    lower.includes("gemini") ||
    lower.includes("claude-3");
  return {
    reasoning: isReasoning,
    tools: true,
    vision: isVision,
  };
}

const DISCOVERY_CACHE_TTL = 60 * 60 * 1000;

type DiscoveryCacheEntry = {
  models: ChatModel[];
  expiresAt: number;
};

const discoveryCache = new Map<string, DiscoveryCacheEntry>();

function getCachedDiscovery(provider: string): ChatModel[] | null {
  const entry = discoveryCache.get(provider);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.models;
  }
  discoveryCache.delete(provider);
  return null;
}

function setDiscoveryCache(provider: string, models: ChatModel[]) {
  discoveryCache.set(provider, {
    expiresAt: Date.now() + DISCOVERY_CACHE_TTL,
    models,
  });
}

async function discoverOpenAIModels(): Promise<ChatModel[]> {
  const cached = getCachedDiscovery("openai");
  if (cached) {
    return cached;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!isValidApiKey(apiKey)) {
    return [];
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { data: { id: string }[] };
    const models = data.data
      .map((m) => m.id)
      .filter(
        (id) =>
          id.startsWith("gpt-") ||
          id.startsWith("o1") ||
          id.startsWith("o3") ||
          id.startsWith("o4")
      )
      .map((id) => ({
        description: `OpenAI ${id}`,
        id: `openai/${id}`,
        name: id,
        provider: "openai",
      }));
    setDiscoveryCache("openai", models);
    return models;
  } catch {
    return [];
  }
}

async function discoverGoogleModels(): Promise<ChatModel[]> {
  const cached = getCachedDiscovery("google");
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!isValidApiKey(apiKey)) {
    return [];
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as {
      models: { name: string; supportedGenerationMethods?: string[] }[];
    };
    const models = data.models
      .filter(
        (m) =>
          m.name.toLowerCase().includes("gemini") &&
          (!m.supportedGenerationMethods ||
            m.supportedGenerationMethods.includes("generateContent"))
      )
      .map((m) => {
        const id = m.name.replace(/^models\//, "");
        return {
          description: `Google ${id}`,
          id: `google/${id}`,
          name: id,
          provider: "google",
        };
      });
    setDiscoveryCache("google", models);
    return models;
  } catch {
    return [];
  }
}

async function discoverXaiModels(): Promise<ChatModel[]> {
  const cached = getCachedDiscovery("xai");
  if (cached) {
    return cached;
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!isValidApiKey(apiKey)) {
    return [];
  }

  try {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { data: { id: string }[] };
    const models = data.data
      .map((m) => m.id)
      .filter((id) => id.startsWith("grok"))
      .map((id) => ({
        description: `xAI ${id}`,
        id: `xai/${id}`,
        name: id,
        provider: "xai",
      }));
    setDiscoveryCache("xai", models);
    return models;
  } catch {
    return [];
  }
}

export async function discoverProviderModels(): Promise<{
  models: ChatModel[];
  capabilities: Record<string, ModelCapabilities>;
}> {
  const configured = getConfiguredProviders();
  const allModels: ChatModel[] = [];
  const allCapabilities: Record<string, ModelCapabilities> = {};

  const builtinIds = new Set(chatModels.map((m) => m.id));

  const tasks: Promise<ChatModel[]>[] = [];

  if (configured.has("openai")) {
    tasks.push(discoverOpenAIModels());
  }
  if (configured.has("google")) {
    tasks.push(discoverGoogleModels());
  }
  if (configured.has("xai")) {
    tasks.push(discoverXaiModels());
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const model of result.value) {
        if (!builtinIds.has(model.id)) {
          allModels.push(model);
          allCapabilities[model.id] = inferCapabilities(model.id);
        }
      }
    }
  }

  return { capabilities: allCapabilities, models: allModels };
}

export function clearDiscoveryCache() {
  discoveryCache.clear();
}

export async function getCustomModelsForUser(
  userId: string
): Promise<ChatModel[]> {
  const { getCustomModelsByProviderId, getCustomProvidersByUserId } =
    await import("../db/queries");
  const providers = await getCustomProvidersByUserId({ userId });
  const allModels = await Promise.all(
    providers.map(async (provider) => {
      const models = await getCustomModelsByProviderId({
        providerId: provider.id,
      });
      return models.map((model) => ({
        description: `${provider.name} (${provider.type})`,
        id: `custom-${provider.id}/${model.modelId}`,
        name: model.name,
        provider: `custom-${provider.id}`,
      }));
    })
  );

  return allModels.flat();
}

export async function getCustomCapabilitiesForUser(
  userId: string
): Promise<Record<string, ModelCapabilities>> {
  const { getCustomModelsByProviderId, getCustomProvidersByUserId } =
    await import("../db/queries");
  const providers = await getCustomProvidersByUserId({ userId });
  const allEntries = await Promise.all(
    providers.map(async (provider) => {
      const models = await getCustomModelsByProviderId({
        providerId: provider.id,
      });
      return models.map((model) => ({
        key: `custom-${provider.id}/${model.modelId}`,
        value: model.capabilities as ModelCapabilities,
      }));
    })
  );

  return Object.fromEntries(
    allEntries.flat().map(({ key, value }) => [key, value])
  );
}
