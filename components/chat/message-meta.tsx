"use client";

import { Gauge, Hash, Timer } from "lucide-react";
import { useStatsForNerds } from "@/lib/stats-for-nerds";
import type { ChatMessage } from "@/lib/types";
import { getMessageNerdStats } from "./message-stats";

export function MessageMeta({ message }: { message: ChatMessage }) {
  const statsForNerds = useStatsForNerds();
  const { modelName, reasoningEffort } = message.metadata ?? {};

  if (message.role !== "assistant" || !modelName) {
    return null;
  }

  const stats = getMessageNerdStats(message, statsForNerds);

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
          className="hidden min-w-0 items-center gap-1 md:flex md:opacity-0 md:transition-opacity md:duration-150 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100"
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
