"use client";

import { type ReactNode, useState } from "react";
import useSWR from "swr";
import { formatCost } from "@/lib/format-cost";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { CodeIcon, FileIcon, MoreHorizontalIcon, PaperclipIcon } from "./icons";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const fetcher = (url: string) => fetch(url).then((response) => response.json());

type ConversationInfo = {
  artifacts: Array<{ id: string; kind: string; title: string }>;
  attachments: Array<{ contentType: string; name: string; url: string }>;
  byModel: Array<{
    cachedInputTokens: number;
    cost: number | null;
    inputTokens: number;
    model: string;
    outputTokens: number;
  }>;
  tokens: { cachedInput: number; input: number; output: number };
  total: number | null;
  unavailableMessages: number;
  pricedMessages: number;
};

export function ConversationInfoDrawer({
  chatId,
  messageCount,
}: {
  chatId: string;
  messageCount: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<ConversationInfo>(
    open
      ? `${BASE_PATH}/api/chat/${chatId}/cost?messages=${messageCount}`
      : null,
    fetcher
  );

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Conversation information"
          className="relative size-11 text-muted-foreground/70"
          data-testid="conversation-info-trigger"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Conversation information</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto" side="right">
        <SheetHeader className="border-b border-border px-5 py-5">
          <SheetTitle>Conversation information</SheetTitle>
          <SheetDescription>
            Details about this conversation and its model usage.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 p-5">
          <section className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cost
              </p>
              <span className="text-xs text-muted-foreground">
                {data?.pricedMessages ?? 0} responses
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {isLoading
                ? "Loading..."
                : data?.total === null
                  ? "Unavailable"
                  : formatCost(data?.total)}
            </p>
            {data?.unavailableMessages ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Pricing is unavailable for {data.unavailableMessages} response
                {data.unavailableMessages === 1 ? "" : "s"}; total is
                unavailable.
              </p>
            ) : null}
            {data?.tokens ? (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-xs">
                <TokenStat label="Input" value={data.tokens.input} />
                <TokenStat label="Output" value={data.tokens.output} />
                <TokenStat label="Cached I/O" value={data.tokens.cachedInput} />
              </div>
            ) : null}
            {data?.byModel.length ? (
              <div className="mt-4 space-y-2 border-t border-border/70 pt-3">
                {data.byModel.map((entry) => (
                  <div
                    className="flex items-center justify-between gap-3 text-xs"
                    key={entry.model}
                  >
                    <span className="truncate text-muted-foreground">
                      {entry.model}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {entry.cost === null
                        ? "Unavailable"
                        : formatCost(entry.cost)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
          <InfoSection
            count={data?.attachments.length ?? 0}
            icon={<PaperclipIcon size={15} />}
            title="Attachments"
          >
            {data?.attachments.length ? (
              data.attachments.map((attachment) => (
                <a
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  href={attachment.url}
                  key={attachment.url || attachment.name}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileIcon size={15} />
                  <span className="truncate">{attachment.name}</span>
                </a>
              ))
            ) : (
              <EmptyState text="No files uploaded" />
            )}
          </InfoSection>
          <InfoSection
            count={data?.artifacts.length ?? 0}
            icon={<CodeIcon size={15} />}
            title="Artifacts"
          >
            {data?.artifacts.length ? (
              data.artifacts.map((artifact) => (
                <a
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  href={`${BASE_PATH}/api/document?id=${artifact.id}`}
                  key={artifact.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileIcon size={15} />
                  <span className="truncate">{artifact.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {artifact.kind}
                  </span>
                </a>
              ))
            ) : (
              <EmptyState text="No artifacts created" />
            )}
          </InfoSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TokenStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function InfoSection({
  children,
  count,
  icon,
  title,
}: {
  children: ReactNode;
  count: number;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-2 py-2 text-xs text-muted-foreground">{text}</p>;
}
