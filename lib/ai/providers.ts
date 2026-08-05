import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { customProvider as aiCustomProvider } from "ai";
import type { CustomProvider } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { isTestEnvironment } from "../constants";
import { getCustomProviderById } from "../db/queries";
import { getCatalogProvider } from "./catalog";
import { decrypt } from "./encryption";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return aiCustomProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedProvider = {
  apiKey: string;
  baseURL: string;
  expiresAt: number;
  type: "openai" | "anthropic";
  providerKey: string | null;
  name: string;
};

const providerCache = new Map<string, CachedProvider>();

export function getCustomProviderOptionsKey(
  provider: Pick<CustomProvider, "providerKey" | "name">
): string {
  return (
    provider.providerKey ??
    provider.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function getCustomProviderSdk(
  provider: Pick<CustomProvider, "type" | "providerKey">
): "openai" | "openai-compatible" {
  if (provider.type !== "openai") {
    throw new Error(`Unexpected provider type: ${provider.type}`);
  }

  if (provider.providerKey) {
    const catalogProvider = getCatalogProvider(provider.providerKey);
    if (catalogProvider?.npm === "@ai-sdk/openai") {
      return "openai";
    }
  }

  return "openai-compatible";
}

export function isOpenAICompatibleProvider(
  provider: Pick<CustomProvider, "type" | "providerKey">
): boolean {
  return (
    provider.type === "openai" &&
    getCustomProviderSdk(provider) === "openai-compatible"
  );
}

function createModelFromProvider(
  provider: Pick<CustomProvider, "type" | "baseURL" | "providerKey" | "name">,
  apiKey: string,
  modelName: string
): LanguageModelV4 {
  if (provider.type === "openai") {
    const sdk = getCustomProviderSdk(provider);

    if (sdk === "openai") {
      // Use the chat completions API for custom OpenAI-compatible providers.
      // The default "languageModel" uses the Responses API, which most custom
      // endpoints (OpenRouter, local proxies, etc.) do not support.
      return createOpenAI({
        apiKey,
        baseURL: provider.baseURL,
      }).chat(modelName);
    }

    return createOpenAICompatible({
      apiKey,
      baseURL: provider.baseURL,
      name: getCustomProviderOptionsKey(provider),
    })(modelName);
  }

  if (provider.type === "anthropic") {
    return createAnthropic({
      apiKey,
      baseURL: provider.baseURL,
    }).languageModel(modelName);
  }

  throw new Error(`Unknown custom provider type: ${provider.type}`);
}

async function resolveCustomProvider(providerId: string, modelName: string) {
  const cached = providerCache.get(providerId);
  if (cached && cached.expiresAt > Date.now()) {
    return createModelFromProvider(
      {
        baseURL: cached.baseURL,
        name: cached.name,
        providerKey: cached.providerKey,
        type: cached.type,
      },
      cached.apiKey,
      modelName
    );
  }

  const provider = await getCustomProviderById({ id: providerId });
  if (!provider) {
    throw new Error(`Custom provider not found: ${providerId}`);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(provider.encryptedApiKey, provider.iv);
  } catch (error) {
    throw new ChatbotError("bad_request:provider", { cause: error });
  }

  const model = createModelFromProvider(provider, apiKey, modelName);
  providerCache.set(providerId, {
    apiKey,
    baseURL: provider.baseURL,
    expiresAt: Date.now() + CACHE_TTL_MS,
    name: provider.name,
    providerKey: provider.providerKey,
    type: provider.type,
  });
  return model;
}

function resolveModel(modelId: string) {
  const [providerName, ...rest] = modelId.split("/");
  const modelName = rest.join("/");

  if (providerName.startsWith("custom-")) {
    const providerId = providerName.slice(7);
    return resolveCustomProvider(providerId, modelName);
  }

  throw new Error(`Unknown provider: ${providerName}`);
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return resolveModel(modelId);
}

export function invalidateProviderCache(providerId: string) {
  providerCache.delete(providerId);
}
