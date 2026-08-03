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

export function getCapabilities(): Record<string, ModelCapabilities> {
  return staticCapabilities;
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

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
