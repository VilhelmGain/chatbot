"use client";

import { Gauge, Hash, Timer } from "lucide-react";
import { useStatsForNerds } from "@/lib/stats-for-nerds";
import type { ChatMessage } from "@/lib/types";

export function MessageMeta({ message }: { message: ChatMessage }) {
  const statsForNerds = useStatsForNerds();
  const {
    modelName,
    outputTokens,
    reasoningEffort,
    timeToFirstToken,
    tokensPerSecond,
  } = message.metadata ?? {};

  if (message.role !== "assistant" || !modelName) {
    return null;
  }

  const stats =
    statsForNerds &&
    typeof outputTokens === "number" &&
    typeof tokensPerSecond === "number" &&
    typeof timeToFirstToken === "number"
      ? {
          timeToFirstToken: (timeToFirstToken / 1000).toFixed(1),
          tokens: Math.round(outputTokens),
          tokensPerSecond: tokensPerSecond.toFixed(2),
        }
      : null;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground/70"
      data-testid="message-meta"
    >
      <span data-testid="message-model-label">
        {modelName}
        {reasoningEffort ? <> · {reasoningEffort}</> : null}
      </span>

      {stats ? (
        <span
          className="flex min-w-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-focus-within/message:opacity-100"
          data-testid="message-nerd-stats"
        >
          <Gauge className="size-3 shrink-0" />
          <span className="tabular-nums">{stats.tokensPerSecond} tps</span>
          <Hash className="size-3 shrink-0" />
          <span className="tabular-nums">{stats.tokens} Tokens</span>
          <Timer className="size-3 shrink-0" />
          <span className="tabular-nums">
            Time-to-first-token: {stats.timeToFirstToken} s
          </span>
        </span>
      ) : null}
    </div>
  );
}
