"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CatalogProvider = {
  baseURL: string;
  key: string;
  modelCount: number;
  name: string;
  type: "openai" | "anthropic";
};

type ProviderFormProps = {
  onCreated: () => void;
  initialData?: {
    id?: string;
    name: string;
    providerKey?: string | null;
    type: "openai" | "anthropic";
    baseURL: string;
  };
  isEdit?: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProviderForm({
  onCreated,
  initialData,
  isEdit = false,
}: ProviderFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<"openai" | "anthropic">(
    initialData?.type ?? "openai"
  );
  const [baseURL, setBaseURL] = useState(initialData?.baseURL ?? "");
  const [apiKey, setApiKey] = useState("");
  const [providerKey, setProviderKey] = useState<string | null>(
    initialData?.providerKey ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(isEdit || !!initialData);

  const { data: catalogData } = useSWR<{ providers: CatalogProvider[] }>(
    isManualMode
      ? null
      : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/catalog`,
    fetcher
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        const url = isEdit
          ? `/api/settings/providers/${(initialData as { id: string }).id}`
          : "/api/settings/providers";
        const method = isEdit ? "PUT" : "POST";

        const body: Record<string, string> = { baseURL, name, type };
        if (apiKey) {
          body.apiKey = apiKey;
        }
        if (providerKey && !isEdit) {
          body.providerKey = providerKey;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${url}`,
          {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            method,
          }
        );

        if (!response.ok) {
          let message = "Failed to save provider";
          try {
            const data = await response.json();
            message = data.message || message;
          } catch {
            // Response body is not valid JSON; use default message
          }
          throw new Error(message);
        }

        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, baseURL, initialData, isEdit, name, onCreated, providerKey, type]
  );

  const handleSelectCatalogProvider = useCallback(
    (catalogProvider: CatalogProvider) => {
      setProviderKey(catalogProvider.key);
      setName(catalogProvider.name);
      setBaseURL(catalogProvider.baseURL);
      setType(catalogProvider.type);
      setIsManualMode(true);
    },
    []
  );

  const handleSwitchToManual = useCallback(() => {
    setIsManualMode(true);
    setProviderKey(null);
    setName("");
    setBaseURL("");
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    []
  );

  const handleTypeChange = useCallback((v: string) => {
    setType(v as "openai" | "anthropic");
  }, []);

  const handleBaseURLChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBaseURL(e.target.value);
    },
    []
  );

  const handleApiKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setApiKey(e.target.value);
    },
    []
  );

  if (!isManualMode && !isEdit) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Select a provider</Label>
          <p className="text-xs text-muted-foreground">
            Choose from known providers or switch to manual entry for custom
            endpoints.
          </p>
        </div>

        <Command className="border rounded-lg">
          <CommandInput placeholder="Search providers..." />
          <CommandList>
            <CommandEmpty>No providers found.</CommandEmpty>
            <CommandGroup heading="Known Providers">
              {catalogData?.providers.map((p) => (
                <CatalogProviderItem
                  key={p.key}
                  onSelect={handleSelectCatalogProvider}
                  provider={p}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <Button onClick={handleSwitchToManual} type="button" variant="outline">
          Custom provider
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Provider Name</Label>
        <Input
          id="name"
          onChange={handleNameChange}
          placeholder="My OpenAI Proxy"
          required
          value={name}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Provider Type</Label>
        <Select onValueChange={handleTypeChange} value={type}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI Compatible</SelectItem>
            <SelectItem value="anthropic">Anthropic Compatible</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {type === "openai"
            ? "For endpoints compatible with the OpenAI API (e.g., Ollama, vLLM, LM Studio)"
            : "For endpoints compatible with the Anthropic Messages API"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="baseURL">Base URL</Label>
        <Input
          id="baseURL"
          onChange={handleBaseURLChange}
          placeholder={
            type === "openai"
              ? "http://localhost:11434/v1"
              : "https://api.anthropic.com/v1"
          }
          required
          type="url"
          value={baseURL}
        />
        <p className="text-xs text-muted-foreground">
          {type === "openai"
            ? "The base URL of your OpenAI-compatible endpoint (without trailing slash)"
            : "The base URL of your Anthropic-compatible endpoint (without trailing slash)"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          onChange={handleApiKeyChange}
          placeholder={isEdit ? "Leave blank to keep current" : "sk-..."}
          required={!isEdit}
          type="password"
          value={apiKey}
        />
        {isEdit ? (
          <p className="text-xs text-muted-foreground">
            Leave blank to keep the current API key
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button className="mt-2" disabled={isLoading} type="submit">
        {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {isEdit ? "Update Provider" : "Add Provider"}
      </Button>
    </form>
  );
}

function CatalogProviderItem({
  provider,
  onSelect,
}: {
  provider: CatalogProvider;
  onSelect: (provider: CatalogProvider) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(provider);
  }, [onSelect, provider]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => e.stopPropagation(),
    []
  );

  return (
    <CommandItem
      onPointerDown={handlePointerDown}
      onSelect={handleSelect}
      value={provider.key}
    >
      <ModelSelectorLogo provider={provider.key} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{provider.name}</span>
        <span className="text-xs text-muted-foreground">
          {provider.modelCount} models
        </span>
      </div>
    </CommandItem>
  );
}
