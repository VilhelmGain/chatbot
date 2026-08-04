export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  providerKey?: string | null;
  description: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};
