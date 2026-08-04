import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { customProvider as aiCustomProvider } from "ai";
import { ChatbotError } from "@/lib/errors";
import { isTestEnvironment } from "../constants";
import { getCustomProviderById } from "../db/queries";
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
};

const providerCache = new Map<string, CachedProvider>();

function createModelFromConfig(
  config: CachedProvider,
  modelName: string
): LanguageModelV4 {
  if (config.type === "openai") {
    // Use the chat completions API for custom OpenAI-compatible providers.
    // The default "languageModel" uses the Responses API, which most custom
    // endpoints (OpenRouter, local proxies, etc.) do not support.
    return createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    }).chat(modelName);
  }
  if (config.type === "anthropic") {
    return createAnthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    }).languageModel(modelName);
  }
  throw new Error(`Unknown custom provider type: ${config.type}`);
}

async function resolveCustomProvider(providerId: string, modelName: string) {
  const cached = providerCache.get(providerId);
  if (cached && cached.expiresAt > Date.now()) {
    return createModelFromConfig(cached, modelName);
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

  if (provider.type === "openai") {
    // Use the chat completions API for custom OpenAI-compatible providers.
    // The default "languageModel" uses the Responses API, which most custom
    // endpoints (OpenRouter, local proxies, etc.) do not support.
    const model = createOpenAI({
      apiKey,
      baseURL: provider.baseURL,
    }).chat(modelName);
    providerCache.set(providerId, {
      apiKey,
      baseURL: provider.baseURL,
      expiresAt: Date.now() + CACHE_TTL_MS,
      type: provider.type,
    });
    return model;
  }

  if (provider.type === "anthropic") {
    const model = createAnthropic({
      apiKey,
      baseURL: provider.baseURL,
    }).languageModel(modelName);
    providerCache.set(providerId, {
      apiKey,
      baseURL: provider.baseURL,
      expiresAt: Date.now() + CACHE_TTL_MS,
      type: provider.type,
    });
    return model;
  }

  throw new Error(`Unknown custom provider type: ${provider.type}`);
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
