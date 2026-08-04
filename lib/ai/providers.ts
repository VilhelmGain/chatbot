import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { createXai } from "@ai-sdk/xai";
import { customProvider as aiCustomProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { getCustomProviderById } from "../db/queries";
import { decrypt } from "./encryption";
import { titleModel } from "./models";

function getOpenAI() {
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getAnthropic() {
  return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getGoogle() {
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
}

function getXai() {
  return createXai({ apiKey: process.env.XAI_API_KEY });
}

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
      apiKey: "unused",
      baseURL: config.baseURL,
    }).chat(modelName);
  }
  if (config.type === "anthropic") {
    return createAnthropic({
      apiKey: "unused",
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

  const apiKey = decrypt(provider.encryptedApiKey, provider.iv);

  if (provider.type === "openai") {
    // Use the chat completions API for custom OpenAI-compatible providers.
    // The default "languageModel" uses the Responses API, which most custom
    // endpoints (OpenRouter, local proxies, etc.) do not support.
    const model = createOpenAI({
      apiKey,
      baseURL: provider.baseURL,
    }).chat(modelName);
    providerCache.set(providerId, {
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

  switch (providerName) {
    case "openai":
      return getOpenAI().languageModel(modelName);
    case "anthropic":
      return getAnthropic().languageModel(modelName);
    case "google":
      return getGoogle().languageModel(modelName);
    case "xai":
      return getXai().languageModel(modelName);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return resolveModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return resolveModel(titleModel.id);
}

export function invalidateProviderCache(providerId: string) {
  providerCache.delete(providerId);
}
