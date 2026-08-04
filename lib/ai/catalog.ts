import type { Model, Provider } from "@opencode-ai/models";
import { generatedAt, providers } from "@opencode-ai/models/snapshot";

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

export function getCatalogProviders(): CatalogProvider[] {
  return Object.values(providers).map((p) => ({
    baseURL: p.api ?? getDefaultBaseURL(p),
    key: p.id,
    modelCount: Object.keys(p.models).length,
    name: p.name,
    npm: p.npm,
    type: resolveProviderType(p),
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

  return Object.values(provider.models)
    .filter((m) => m.status !== "deprecated")
    .map((m) => ({
      capabilities: mapModelCapabilities(m),
      modelId: m.id,
      name: m.name,
    }));
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
      result.reasoningEfforts = effortOption.values
        .filter((v) => v !== null)
        .map((v) => v as string);
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

export function getCatalogGeneratedAt(): string {
  return generatedAt;
}
