import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
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
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

function resolveModel(modelId: string) {
  const [providerName, ...rest] = modelId.split("/");
  const modelName = rest.join("/");

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
