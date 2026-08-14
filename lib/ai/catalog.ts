import type { Model, Provider, ProviderMap } from "@opencode-ai/models";
import { Models } from "@opencode-ai/models";
import { generatedAt, providers } from "@opencode-ai/models/snapshot";
import { isTestEnvironment } from "../constants";

export type CatalogProvider = {
  key: string;
  name: string;
  baseURL: string;
  type: "openai" | "anthropic";
  modelCount: number;
  npm: string;
};

export type CatalogModel = {
  modelId: string;
  name: string;
  capabilities: {
    tools: boolean;
    vision: boolean;
    reasoning: boolean;
    reasoningEfforts?: string[];
  };
};

const LIVE_CATALOG_TTL_MS = 5 * 60 * 1000;

let liveCache: { fetchedAt: number; providers: ProviderMap | null } | null =
  null;

async function getLiveProviders(force = false): Promise<ProviderMap | null> {
  if (isTestEnvironment) {
    return null;
  }

  const cached = liveCache;
  if (!force && cached && Date.now() - cached.fetchedAt < LIVE_CATALOG_TTL_MS) {
    return cached.providers;
  }

  try {
    const client = Models.make();
    const liveProviders = await client.providers();
    liveCache = { fetchedAt: Date.now(), providers: liveProviders };
    return liveProviders;
  } catch (error) {
    console.error(
      "[catalog] Failed to fetch live catalog from models.dev:",
      error
    );
    if (cached) {
      return cached.providers;
    }
    liveCache = { fetchedAt: Date.now(), providers: null };
    return null;
  }
}

function providerToCatalogProvider(p: Provider): CatalogProvider {
  return {
    baseURL: p.api ?? getDefaultBaseURL(p),
    key: p.id,
    modelCount: Object.keys(p.models).length,
    name: p.name,
    npm: p.npm,
    type: resolveProviderType(p),
  };
}

function providerToCatalogModels(p: Provider): CatalogModel[] {
  return Object.values(p.models)
    .filter((m) => m.status !== "deprecated")
    .map((m) => ({
      capabilities: mapModelCapabilities(m),
      modelId: m.id,
      name: m.name,
    }));
}

export function getCatalogProvider(key: string): Provider | undefined {
  return providers[key];
}

export function getCatalogModelsForProvider(key: string): CatalogModel[] {
  const provider = providers[key];
  if (!provider) {
    return [];
  }

  return providerToCatalogModels(provider);
}

export async function getLiveCatalogProviders(
  force = false
): Promise<{ generatedAt: string; providers: CatalogProvider[] }> {
  const live = await getLiveProviders(force);
  const source = live ?? providers;
  return {
    generatedAt: live ? new Date().toISOString() : generatedAt,
    providers: Object.values(source).map(providerToCatalogProvider),
  };
}

export async function getLiveCatalogModelsForProvider(
  key: string,
  force = false
): Promise<CatalogModel[]> {
  const live = await getLiveProviders(force);
  const provider = live?.[key] ?? providers[key];
  if (!provider) {
    return [];
  }

  return providerToCatalogModels(provider);
}

export function mapModelCapabilities(model: Model): {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  reasoningEfforts?: string[];
} {
  const result: {
    tools: boolean;
    vision: boolean;
    reasoning: boolean;
    reasoningEfforts?: string[];
  } = {
    reasoning: model.reasoning === true,
    tools: model.tool_call === true,
    vision:
      model.attachment === true ||
      model.modalities?.input?.includes("image") === true,
  };

  if (model.reasoning && model.reasoning_options) {
    const effortOption = model.reasoning_options.find(
      (opt) => opt.type === "effort"
    );
    if (effortOption && effortOption.type === "effort") {
      result.reasoningEfforts = effortOption.values.map((v) =>
        v === null ? "none" : v
      );
    }
  }

  return result;
}

function resolveProviderType(provider: Provider): "openai" | "anthropic" {
  if (provider.npm?.includes("anthropic")) {
    return "anthropic";
  }
  return "openai";
}

function getDefaultBaseURL(provider: Provider): string {
  if (provider.npm?.includes("anthropic")) {
    return "https://api.anthropic.com/v1";
  }
  if (provider.npm?.includes("openai")) {
    return "https://api.openai.com/v1";
  }
  if (provider.npm?.includes("google")) {
    return "https://generativelanguage.googleapis.com";
  }
  return "";
}
