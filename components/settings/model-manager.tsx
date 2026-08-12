"use client";

import { Download, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AddModelForm } from "./add-model-form";

type CustomModel = {
  capabilities: {
    reasoning: boolean;
    tools: boolean;
    vision: boolean;
    reasoningEfforts?: string[];
  };
  createdAt: string;
  id: string;
  modelId: string;
  name: string;
  providerId: string;
};

type ModelManagerProps = {
  providerId: string;
  providerKey: string | null;
};

type CapabilityKey = "tools" | "vision" | "reasoning";

const CAPABILITY_STYLES: Array<{
  activeClasses: string;
  key: CapabilityKey;
  label: string;
}> = [
  {
    activeClasses:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    key: "tools",
    label: "tools",
  },
  {
    activeClasses:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    key: "vision",
    label: "vision",
  },
  {
    activeClasses:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    key: "reasoning",
    label: "reasoning",
  },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ModelManager({ providerId, providerKey }: ModelManagerProps) {
  const {
    data: models,
    error,
    isLoading,
    mutate,
  } = useSWR<CustomModel[]>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers/${providerId}/models`,
    fetcher
  );

  const [showAddModel, setShowAddModel] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleModelAdded = useCallback(() => {
    setShowAddModel(false);
    mutate();
    toast({ description: "Model added", type: "success" });
  }, [mutate]);

  const handleModelDeleted = useCallback(() => {
    mutate();
    toast({ description: "Model removed", type: "success" });
  }, [mutate]);

  const handleModelUpdated = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleAutoDetect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers/${providerId}/detect`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.error) {
        toast({ description: data.error, type: "error" });
      } else {
        toast({
          description: `Detected ${data.detected} model(s)`,
          type: "success",
        });
        mutate();
      }
    } catch {
      toast({ description: "Auto-detection failed", type: "error" });
    } finally {
      setIsDetecting(false);
    }
  }, [mutate, providerId]);

  const handleImportCatalog = useCallback(async () => {
    setIsImporting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers/${providerId}/import-catalog`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.error) {
        toast({ description: data.error, type: "error" });
      } else {
        toast({
          description: `Imported ${data.imported} model(s) from catalog`,
          type: "success",
        });
        mutate();
      }
    } catch {
      toast({ description: "Catalog import failed", type: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [mutate, providerId]);

  const handleToggleAddModel = useCallback(() => {
    setShowAddModel((prev) => !prev);
  }, []);

  useEffect(() => {
    if (error) {
      toast({ description: "Failed to load models", type: "error" });
    }
  }, [error]);

  return (
    <div className="ml-10 mt-2 rounded-xl border border-border bg-muted/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Models
          {providerKey ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              from models.dev
            </span>
          ) : null}
        </h3>
        <div className="flex items-center gap-2">
          {providerKey ? (
            <Button
              disabled={isImporting}
              onClick={handleImportCatalog}
              size="sm"
              variant="outline"
            >
              {isImporting ? (
                <Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <Download className="mr-1.5 size-3" />
              )}
              Refresh from catalog
            </Button>
          ) : (
            <Button
              disabled={isDetecting}
              onClick={handleAutoDetect}
              size="sm"
              variant="outline"
            >
              {isDetecting ? (
                <Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-3" />
              )}
              Auto-detect
            </Button>
          )}
          <Button onClick={handleToggleAddModel} size="sm">
            <Plus className="mr-1.5 size-3" />
            Add Model
          </Button>
        </div>
      </div>

      {showAddModel ? (
        <div className="mb-3">
          <AddModelForm
            onModelAdded={handleModelAdded}
            providerId={providerId}
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : models?.length ? (
        <div className="flex flex-col gap-1.5">
          {models.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              onDeleted={handleModelDeleted}
              onUpdated={handleModelUpdated}
              providerId={providerId}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {providerKey
            ? "No models yet — use Refresh from catalog to import them."
            : "No models configured. Add a model manually or use auto-detect."}
        </p>
      )}
    </div>
  );
}

function ModelRow({
  model,
  providerId,
  onDeleted,
  onUpdated,
}: {
  model: CustomModel;
  providerId: string;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [capabilities, setCapabilities] = useState(model.capabilities);
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers/${providerId}/models/${model.id}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        onDeleted();
      } else {
        toast({
          description: "Failed to delete model",
          type: "error",
        });
      }
    } catch {
      toast({
        description: "Failed to delete model",
        type: "error",
      });
    }
  }, [model.id, onDeleted, providerId]);

  const handleToggleCapability = useCallback(
    async (key: CapabilityKey) => {
      const newCapabilities = { ...capabilities, [key]: !capabilities[key] };
      setCapabilities(newCapabilities);
      setIsSaving(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers/${providerId}/models/${model.id}`,
          {
            body: JSON.stringify({ capabilities: newCapabilities }),
            headers: { "Content-Type": "application/json" },
            method: "PATCH",
          }
        );
        if (response.ok) {
          onUpdated();
          toast({ description: "Capability updated", type: "success" });
        } else {
          setCapabilities(capabilities);
          toast({ description: "Failed to update capability", type: "error" });
        }
      } catch {
        setCapabilities(capabilities);
        toast({ description: "Failed to update capability", type: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [capabilities, model.id, onUpdated, providerId]
  );

  return (
    <div className="flex items-center justify-between rounded-xl bg-transparent px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{model.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {model.modelId}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {CAPABILITY_STYLES.map(({ key, label, activeClasses }) => (
            <CapabilityPill
              active={capabilities[key]}
              activeClasses={activeClasses}
              capabilityKey={key}
              disabled={isSaving}
              key={key}
              label={label}
              onToggle={handleToggleCapability}
            />
          ))}
        </div>
      </div>
      <Button
        className="size-7 p-0"
        onClick={handleDelete}
        size="icon"
        variant="ghost"
      >
        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

function CapabilityPill({
  active,
  activeClasses,
  capabilityKey,
  disabled,
  label,
  onToggle,
}: {
  active: boolean;
  activeClasses: string;
  capabilityKey: CapabilityKey;
  disabled: boolean;
  label: string;
  onToggle: (key: CapabilityKey) => void;
}) {
  const handleClick = useCallback(() => {
    onToggle(capabilityKey);
  }, [capabilityKey, onToggle]);

  return (
    <button
      aria-pressed={active}
      className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active
          ? activeClasses
          : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}
