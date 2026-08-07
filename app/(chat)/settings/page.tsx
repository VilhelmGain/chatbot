"use client";

import { ArrowLeft, Plus, Server } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/chat/toast";
import { ExportChats } from "@/components/settings/export-chats";
import { ModelManager } from "@/components/settings/model-manager";
import { ProviderCard } from "@/components/settings/provider-card";
import { ProviderForm } from "@/components/settings/provider-form";
import { TitleModelSelector } from "@/components/settings/title-model-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type CustomProvider = {
  baseURL: string;
  createdAt: string;
  id: string;
  name: string;
  providerKey: string | null;
  type: "openai" | "anthropic";
  updatedAt: string;
  userId: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    data: providers,
    error,
    isLoading,
    mutate,
  } = useSWR<CustomProvider[]>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/settings/providers`,
    fetcher
  );

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(
    null
  );

  const handleOpenAddProvider = useCallback(() => {
    setShowAddProvider(true);
  }, []);

  const handleProviderCreated = useCallback(() => {
    setShowAddProvider(false);
    mutate();
    toast({ description: "Provider added successfully", type: "success" });
  }, [mutate]);

  const handleProviderDeleted = useCallback(
    (id: string) => {
      if (expandedProviderId === id) {
        setExpandedProviderId(null);
      }
      mutate();
      toast({ description: "Provider deleted", type: "success" });
    },
    [mutate, expandedProviderId]
  );

  const handleProviderUpdated = useCallback(() => {
    mutate();
    toast({ description: "Provider updated", type: "success" });
  }, [mutate]);

  const handleToggleProvider = useCallback((id: string) => {
    setExpandedProviderId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    if (error) {
      toast({ description: "Failed to load providers", type: "error" });
    }
  }, [error]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link href="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your custom AI providers
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Preferences</h2>
        <TitleModelSelector />
        <div className="flex flex-col gap-2">
          <Label htmlFor="theme">Theme</Label>
          <Select onValueChange={setTheme} value={theme}>
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose your preferred color scheme.
          </p>
        </div>
      </div>

      <ExportChats />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Custom Providers</h2>
        <Button onClick={handleOpenAddProvider} size="sm">
          <Plus className="mr-1.5 size-3.5" />
          Add Provider
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : providers?.length ? (
        <div className="flex flex-col gap-3">
          {providers.map((provider) => (
            <ProviderRow
              expandedProviderId={expandedProviderId}
              key={provider.id}
              onDeleted={handleProviderDeleted}
              onToggle={handleToggleProvider}
              onUpdated={handleProviderUpdated}
              provider={provider}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <Server className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No custom providers</p>
            <p className="text-sm text-muted-foreground">
              Add an OpenAI or Anthropic compatible provider to use your own
              models
            </p>
          </div>
        </div>
      )}

      <Dialog onOpenChange={setShowAddProvider} open={showAddProvider}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
          </DialogHeader>
          <ProviderForm onCreated={handleProviderCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderRow({
  provider,
  expandedProviderId,
  onDeleted,
  onToggle,
  onUpdated,
}: {
  provider: CustomProvider;
  expandedProviderId: string | null;
  onDeleted: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdated: () => void;
}) {
  const isExpanded = expandedProviderId === provider.id;

  const handleDeleted = useCallback(() => {
    onDeleted(provider.id);
  }, [onDeleted, provider.id]);

  const handleToggle = useCallback(() => {
    onToggle(provider.id);
  }, [onToggle, provider.id]);

  return (
    <div>
      <ProviderCard
        isExpanded={isExpanded}
        onDeleted={handleDeleted}
        onToggle={handleToggle}
        onUpdated={onUpdated}
        provider={provider}
      />
      {isExpanded ? (
        <ModelManager
          providerId={provider.id}
          providerKey={provider.providerKey}
        />
      ) : null}
    </div>
  );
}
