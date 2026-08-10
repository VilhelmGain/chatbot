"use client";

import {
  Download,
  type LucideIcon,
  Palette,
  Plus,
  Scale,
  Server,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/chat/toast";
import { ExportAttachments } from "@/components/settings/export-attachments";
import { ExportChats } from "@/components/settings/export-chats";
import { IdentityDisplaySelector } from "@/components/settings/identity-display-selector";
import { LegalPanel } from "@/components/settings/legal-panel";
import { ModelManager } from "@/components/settings/model-manager";
import { ProviderCard } from "@/components/settings/provider-card";
import { ProviderForm } from "@/components/settings/provider-form";
import { TitleModelSelector } from "@/components/settings/title-model-selector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { setStatsForNerds, useStatsForNerds } from "@/lib/stats-for-nerds";
import { cn } from "@/lib/utils";

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

type SettingsSection = "preferences" | "data" | "providers" | "legal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const NAV_ITEMS = [
  {
    description: "Model defaults, theme, and identity",
    icon: SlidersHorizontal,
    id: "preferences",
    label: "Preferences",
    title: "Chat preferences",
  },
  {
    description: "Export chats and attachment files",
    icon: Download,
    id: "data",
    label: "Data",
    title: "Data & exports",
  },
  {
    description: "Custom API endpoints and models",
    icon: Server,
    id: "providers",
    label: "Providers",
    title: "Providers & models",
  },
  {
    description: "Privacy policy and terms of service",
    icon: Scale,
    id: "legal",
    label: "Legal",
    title: "Legal",
  },
] as const satisfies ReadonlyArray<{
  description: string;
  icon: LucideIcon;
  id: SettingsSection;
  label: string;
  title: string;
}>;

export function SettingsDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("preferences");
  const activeItem =
    NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="h-[min(46rem,calc(100dvh-1rem))] w-[min(64rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-3xl! p-0 md:h-[min(46rem,calc(100dvh-2rem))] md:w-[min(68rem,calc(100vw-2rem))] md:max-w-[calc(100vw-2rem)]"
        data-testid="settings-dialog"
        showCloseButton={false}
      >
        <div className="grid h-full min-h-0 md:grid-cols-[16.5rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
            <div className="flex items-start gap-3 px-5 pb-5 pt-6">
              <div className="grid size-9 shrink-0 place-items-center rounded-3xl bg-sidebar-foreground/10 text-sidebar-foreground">
                <Settings2 className="size-4" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold tracking-tight">Settings</p>
                <DialogDescription className="text-xs leading-5 text-sidebar-foreground/50">
                  Workspace configuration
                </DialogDescription>
              </div>
            </div>

            <nav aria-label="Settings" className="flex flex-col gap-1 px-3">
              {NAV_ITEMS.map((item) => (
                <SettingsNavButton
                  active={item.id === activeSection}
                  icon={item.icon}
                  id={item.id}
                  key={item.id}
                  label={item.label}
                  onSelect={setActiveSection}
                />
              ))}
            </nav>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden bg-transparent">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8/70 bg-transparent/95 px-5 py-4 backdrop-blur-xl md:px-8 md:py-5">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  {activeItem.label}
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {activeItem.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {activeItem.description}
                </p>
              </div>
              <DialogClose asChild>
                <Button
                  aria-label="Close settings"
                  className="-mr-2 text-muted-foreground"
                  size="icon-sm"
                  variant="ghost"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close settings</span>
                </Button>
              </DialogClose>
            </header>

            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/8/70 glass-surface/40 px-3 py-2 no-scrollbar md:hidden">
              {NAV_ITEMS.map((item) => (
                <MobileSettingsNavButton
                  active={item.id === activeSection}
                  icon={item.icon}
                  id={item.id}
                  key={item.id}
                  label={item.label}
                  onSelect={setActiveSection}
                />
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-behavior-contain">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6 md:px-8 md:py-8">
                {activeSection === "preferences" ? <PreferencesPanel /> : null}
                {activeSection === "data" ? <DataPanel /> : null}
                {activeSection === "providers" ? <ProvidersPanel /> : null}
                {activeSection === "legal" ? <LegalPanel /> : null}
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsNavButton({
  active,
  icon: Icon,
  id,
  label,
  onSelect,
}: {
  active: boolean;
  icon: LucideIcon;
  id: SettingsSection;
  label: string;
  onSelect: (id: SettingsSection) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  return (
    <button
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-3xl px-3 py-2.5 text-left text-sm transition-colors duration-150",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
      onClick={handleSelect}
      type="button"
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block truncate text-xs text-sidebar-foreground/40">
          {NAV_ITEMS.find((item) => item.id === id)?.description}
        </span>
      </span>
    </button>
  );
}

function MobileSettingsNavButton({
  active,
  icon: Icon,
  id,
  label,
  onSelect,
}: {
  active: boolean;
  icon: LucideIcon;
  id: SettingsSection;
  label: string;
  onSelect: (id: SettingsSection) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  return (
    <button
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-3xl px-3 py-2 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-foreground text-background"
          : "bg-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
      onClick={handleSelect}
      type="button"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function PreferencesPanel() {
  const { theme, setTheme } = useTheme();
  const statsForNerds = useStatsForNerds();

  return (
    <>
      <div className="flex flex-col gap-5 rounded-3xl border border-white/8/70 glass-surface/40 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-3xl bg-white/5">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Chat defaults</h3>
            <p className="text-xs text-muted-foreground">
              Used for new chats and sidebar labels.
            </p>
          </div>
        </div>
        <div className="grid gap-5 border-t border-white/10 pt-5">
          <TitleModelSelector />
          <IdentityDisplaySelector />
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-white/8/70 glass-surface/40 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-3xl bg-white/5">
            <Palette className="size-3.5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Appearance</h3>
            <p className="text-xs text-muted-foreground">
              Theme preference for this browser.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-5">
          <Label htmlFor="theme">Theme</Label>
          <Select onValueChange={setTheme} value={theme}>
            <SelectTrigger className="w-full sm:w-64" id="theme">
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
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5/20 px-3 py-2.5">
            <div className="flex flex-col gap-1">
              <Label htmlFor="stats-for-nerds">Stats for nerds</Label>
              <p className="text-xs text-muted-foreground">
                Show token and latency details on responses.
              </p>
            </div>
            <Checkbox
              checked={statsForNerds}
              data-testid="stats-for-nerds-toggle"
              id="stats-for-nerds"
              onCheckedChange={setStatsForNerds}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function DataPanel() {
  return (
    <>
      <ExportChats />
      <ExportAttachments />
    </>
  );
}

function ProvidersPanel() {
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
      setExpandedProviderId((current) => (current === id ? null : current));
      mutate();
      toast({ description: "Provider deleted", type: "success" });
    },
    [mutate]
  );

  const handleProviderUpdated = useCallback(() => {
    mutate();
    toast({ description: "Provider updated", type: "success" });
  }, [mutate]);

  const handleToggleProvider = useCallback((id: string) => {
    setExpandedProviderId((current) => (current === id ? null : id));
  }, []);

  useEffect(() => {
    if (error) {
      toast({ description: "Failed to load providers", type: "error" });
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Custom providers</h3>
          <p className="text-xs text-muted-foreground">
            OpenAI and Anthropic compatible endpoints.
          </p>
        </div>
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
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed py-12 text-center">
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
