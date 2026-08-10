import { memo, useCallback } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { useStatsForNerds } from "@/lib/stats-for-nerds";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  CopyIcon,
  GitForkIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
} from "./icons";
import { getMessageNerdStats } from "./message-stats";

export function PureMessageActions({
  message,
  isLoading,
  onEdit,
  onFork,
}: {
  message: ChatMessage;
  isLoading: boolean;
  onEdit?: () => void;
  onFork?: () => void;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const statsForNerds = useStatsForNerds();
  const stats = getMessageNerdStats(message, statsForNerds);

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = useCallback(async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  }, [copyToClipboard, textFromParts]);

  if (isLoading) {
    return null;
  }

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end">
        <div className="hidden items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 md:flex">
          {onEdit ? (
            <Action
              className="size-7 text-muted-foreground/50 hover:text-foreground"
              data-testid="message-edit-button"
              onClick={onEdit}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          ) : null}
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            onClick={handleCopy}
            tooltip="Copy"
          >
            <CopyIcon />
          </Action>
        </div>
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Message actions"
                className="relative size-11 text-muted-foreground/60 after:absolute after:-inset-[6px] md:after:hidden"
                data-testid="message-actions-mobile-trigger"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon />
                <span className="sr-only">Message actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-56"
              data-testid="message-actions-menu"
            >
              {onEdit ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  data-testid="message-edit-mobile"
                  onClick={onEdit}
                >
                  <PencilEditIcon />
                  <span>Edit</span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer"
                data-testid="message-copy-mobile"
                onClick={handleCopy}
              >
                <CopyIcon />
                <span>Copy</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5">
      <div className="hidden items-center opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 md:flex">
        <Action
          className="text-muted-foreground/50 hover:text-foreground"
          onClick={handleCopy}
          tooltip="Copy"
        >
          <CopyIcon />
        </Action>

        {onFork ? (
          <Action
            className="text-muted-foreground/50 hover:text-foreground"
            data-testid="message-fork"
            onClick={onFork}
            tooltip="Fork conversation"
          >
            <GitForkIcon />
          </Action>
        ) : null}
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Message actions"
              className="relative size-11 text-muted-foreground/60 after:absolute after:-inset-[6px] md:after:hidden"
              data-testid="message-actions-mobile-trigger"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontalIcon />
              <span className="sr-only">Message actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            data-testid="message-actions-menu"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              data-testid="message-copy-mobile"
              onClick={handleCopy}
            >
              <CopyIcon />
              <span>Copy</span>
            </DropdownMenuItem>
            {onFork ? (
              <DropdownMenuItem
                className="cursor-pointer"
                data-testid="message-fork-mobile"
                onClick={onFork}
              >
                <GitForkIcon />
                <span>Fork conversation</span>
              </DropdownMenuItem>
            ) : null}
            {stats ? (
              <>
                <DropdownMenuLabel>Nerd stats</DropdownMenuLabel>
                <DropdownMenuItem
                  className="flex-col items-start gap-1 py-3"
                  data-testid="message-stats-menu-item"
                  disabled
                >
                  <span className="tabular-nums">
                    {stats.tokensPerSecond} tps
                  </span>
                  <span className="tabular-nums">{stats.tokens} Tokens</span>
                  <span className="tabular-nums">
                    Time-to-first-token: {stats.timeToFirstToken} s
                  </span>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => prevProps.isLoading === nextProps.isLoading
);
