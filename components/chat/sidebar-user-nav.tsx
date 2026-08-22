"use client";

import { useUser } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { useCallback, useState } from "react";
import type { User } from "@/app/(auth)/auth";
import { AccountDialog } from "@/components/chat/account-dialog";
import { UserAvatar } from "@/components/chat/user-avatar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  type IdentityDisplayMode,
  useIdentityDisplayMode,
} from "@/lib/identity-display";

function ClerkAvatar({ user }: { user: User }) {
  const { isLoaded, user: clerkUser } = useUser();
  const src = isLoaded && clerkUser?.imageUrl ? clerkUser.imageUrl : user.image;
  return <UserAvatar email={user.email ?? ""} src={src} />;
}

function IdentityLabel({
  mode,
  user,
}: {
  mode: IdentityDisplayMode;
  user: User;
}) {
  if (mode === "email") {
    return (
      <span className="truncate text-[13px]" data-testid="user-nav-label">
        {user.email}
      </span>
    );
  }
  if (mode === "name-email") {
    return (
      <div className="flex min-w-0 flex-col" data-testid="user-nav-label">
        <span className="truncate text-[13px]">{user.name ?? user.email}</span>
        {user.name ? (
          <span className="truncate text-[11px] text-sidebar-foreground/60">
            {user.email}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <span className="truncate text-[13px]" data-testid="user-nav-label">
      {user.name ?? user.email}
    </span>
  );
}

export function SidebarUserNav({
  testEnvironment,
  user,
}: {
  testEnvironment: boolean;
  user: User;
}) {
  const [showAccount, setShowAccount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const identityDisplayMode = useIdentityDisplayMode();

  const handleOpenAccount = useCallback(() => {
    setShowAccount(true);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-1 rounded-lg bg-transparent p-1">
            <button
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${identityDisplayMode === "name-email" ? "h-10" : "h-8"}`}
              data-testid="user-nav-button"
              onClick={handleOpenAccount}
              type="button"
            >
              {testEnvironment ? (
                <UserAvatar email={user.email ?? ""} src={user.image} />
              ) : (
                <ClerkAvatar user={user} />
              )}
              <IdentityLabel mode={identityDisplayMode} user={user} />
            </button>
            <button
              aria-label="Settings"
              className="grid size-8 shrink-0 place-items-center rounded-md text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              data-testid="user-nav-item-settings"
              onClick={handleOpenSettings}
              type="button"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      <AccountDialog
        onOpenChange={setShowAccount}
        open={showAccount}
        testEnvironment={testEnvironment}
        user={user}
      />
      <SettingsDialog onOpenChange={setShowSettings} open={showSettings} />
    </>
  );
}
