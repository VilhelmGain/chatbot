"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatCost } from "@/lib/format-cost";
import { useShowConversationCost } from "@/lib/show-conversation-cost";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { MoreHorizontalIcon } from "./icons";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const fetcher = (url: string) => fetch(url).then((response) => response.json());

export function ConversationInfoDrawer({ chatId }: { chatId: string }) {
  const enabled = useShowConversationCost();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<{
    total: number;
    unavailableMessages: number;
  }>(open && enabled ? `${BASE_PATH}/api/chat/${chatId}/cost` : null, fetcher);

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
          {enabled ? (
            <section className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cost
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "Loading..." : formatCost(data?.total)}
              </p>
              {data?.unavailableMessages ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pricing is unavailable for {data.unavailableMessages} response
                  {data.unavailableMessages === 1 ? "" : "s"}.
                </p>
              ) : null}
            </section>
          ) : null}
          <section className="rounded-xl border border-dashed border-border p-4">
            <p className="text-sm font-medium">More conversation details</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Additional conversation information will appear here.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
