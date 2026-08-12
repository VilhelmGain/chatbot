"use client";

import { Check, WrenchIcon } from "lucide-react";
import { memo, useCallback, useState } from "react";
import useSWR from "swr";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { useActiveChat } from "@/hooks/use-active-chat";
import type { ModelCapabilities } from "@/lib/ai/models.client";
import type { ToolId } from "@/lib/ai/tools/metadata";
import { TOOL_IDS, TOOL_METADATA } from "@/lib/ai/tools/metadata";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

function ToolSelectorItem({
  checked,
  id,
  onToggle,
}: {
  checked: boolean;
  id: ToolId;
  onToggle: (id: ToolId) => void;
}) {
  const meta = TOOL_METADATA[id];
  const handleSelect = useCallback(() => onToggle(id), [id, onToggle]);

  return (
    <ModelSelectorItem
      className="flex w-full items-center gap-2.5 py-2"
      onSelect={handleSelect}
      value={id}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-md border transition-all",
          checked
            ? "border-primary bg-primary text-primary-foreground glow-primary"
            : "border-foreground/20 bg-foreground/5"
        )}
      >
        {checked ? <Check className="size-3" /> : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] leading-tight">{meta.label}</span>
        <span className="truncate text-[11px] leading-tight text-muted-foreground">
          {meta.description}
        </span>
      </span>
    </ModelSelectorItem>
  );
}

function PureToolsMenu({ selectedModelId }: { selectedModelId: string }) {
  const { enabledTools, setEnabledTools } = useActiveChat();
  const [open, setOpen] = useState(false);

  const { data: modelsData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { dedupingInterval: 3_600_000, revalidateOnFocus: false }
  );

  const toggleTool = useCallback(
    (id: ToolId) => {
      setEnabledTools(
        enabledTools.includes(id)
          ? enabledTools.filter((toolId) => toolId !== id)
          : [...enabledTools, id]
      );
    },
    [enabledTools, setEnabledTools]
  );

  const handleEnableAll = useCallback(() => {
    setEnabledTools([...TOOL_IDS]);
  }, [setEnabledTools]);

  const handleDisableAll = useCallback(() => {
    setEnabledTools([]);
  }, [setEnabledTools]);

  const capabilities: Record<string, ModelCapabilities> | undefined =
    modelsData?.capabilities ?? modelsData;

  if (capabilities?.[selectedModelId]?.tools !== true) {
    return null;
  }

  const enabledSet = new Set(enabledTools);
  const allEnabled = enabledTools.length === TOOL_IDS.length;

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          aria-label="Tools"
          className="h-7 justify-between gap-1.5 rounded-md border border-input bg-foreground/4 px-2 text-[12px] text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
          data-testid="tools-menu"
          variant="ghost"
        >
          <WrenchIcon className="size-3.5 shrink-0" />
          <ModelSelectorName>Tools</ModelSelectorName>
          {allEnabled ? null : (
            <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              {enabledTools.length}/{TOOL_IDS.length}
            </span>
          )}
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="w-[min(320px,calc(100vw-24px))] p-1">
        <ModelSelectorList>
          {TOOL_IDS.map((id) => (
            <ToolSelectorItem
              checked={enabledSet.has(id)}
              id={id}
              key={id}
              onToggle={toggleTool}
            />
          ))}
        </ModelSelectorList>
        <ModelSelectorSeparator />
        <div className="flex gap-1 p-1">
          <Button
            className="h-7 flex-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground"
            onClick={handleEnableAll}
            size="sm"
            type="button"
            variant="ghost"
          >
            Enable all
          </Button>
          <Button
            className="h-7 flex-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground"
            onClick={handleDisableAll}
            size="sm"
            type="button"
            variant="ghost"
          >
            Disable all
          </Button>
        </div>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

export const ToolsMenu = memo(PureToolsMenu);
