import type { ChatMessage } from "@/lib/types";

export type MessageNerdStats = {
  timeToFirstToken: string;
  tokens: number;
  tokensPerSecond: string;
};

export function getMessageNerdStats(
  message: ChatMessage,
  statsForNerdsEnabled: boolean
): MessageNerdStats | null {
  const { modelName, outputTokens, timeToFirstToken, tokensPerSecond } =
    message.metadata ?? {};

  if (
    message.role !== "assistant" ||
    !modelName ||
    !statsForNerdsEnabled ||
    typeof outputTokens !== "number" ||
    typeof timeToFirstToken !== "number" ||
    typeof tokensPerSecond !== "number"
  ) {
    return null;
  }

  return {
    timeToFirstToken: (timeToFirstToken / 1000).toFixed(1),
    tokens: Math.round(outputTokens),
    tokensPerSecond: tokensPerSecond.toFixed(2),
  };
}
