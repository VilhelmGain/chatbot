"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronUp, Settings, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import type { User } from "@/app/(auth)/auth";
import { signOut } from "@/app/(chat)/actions";
import { AccountDialog } from "@/components/chat/account-dialog";
import { UserAvatar } from "@/components/chat/user-avatar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type IdentityDisplayMode,
  useIdentityDisplayMode,
} from "@/lib/identity-display";

function TestSignOutItem() {
  return (
    <DropdownMenuItem asChild data-testid="user-nav-item-auth">
      <form action={signOut}>
        <button className="w-full cursor-pointer text-[13px]" type="submit">
          Sign out
        </button>
      </form>
    </DropdownMenuItem>
  );
}

function ClerkSignOutItem() {
  const { signOut: clerkSignOut } = useClerk();
  const handleSignOut = useCallback(() => {
    clerkSignOut({ redirectUrl: "/" });
  }, [clerkSignOut]);
  return (
    <DropdownMenuItem data-testid="user-nav-item-auth" onSelect={handleSignOut}>
      <span className="w-full cursor-pointer text-[13px]">Sign out</span>
    </DropdownMenuItem>
  );
}

function ClerkAvatar({ user }: { user: User }) {
  const { isLoaded, user: clerkUser } = useUser();
  const src = isLoaded ? clerkUser?.imageUrl : user.image;
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
          <span className="truncate text-[11px] text-sidebar-foreground/40">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className={`${identityDisplayMode === "name-email" ? "h-10" : "h-8"} px-2 rounded-3xl bg-transparent text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground`}
                data-testid="user-nav-button"
              >
                {testEnvironment ? (
                  <UserAvatar email={user.email ?? ""} src={user.image} />
                ) : (
                  <ClerkAvatar user={user} />
                )}
                <IdentityLabel mode={identityDisplayMode} user={user} />
                <ChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-popper-anchor-width) rounded-3xl border border-white/10 glass-surface/95 backdrop-blur-xl shadow-[var(--shadow-float)]"
              data-testid="user-nav-menu"
              side="top"
            >
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="user-nav-item-settings"
                onSelect={handleOpenSettings}
              >
                <span className="flex w-full cursor-pointer items-center text-[13px]">
                  <Settings className="mr-2 size-3.5" />
                  Settings
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="user-nav-item-account"
                onSelect={handleOpenAccount}
              >
                <span className="flex w-full cursor-pointer items-center text-[13px]">
                  <UserRound className="mr-2 size-3.5" />
                  Account
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {testEnvironment ? <TestSignOutItem /> : <ClerkSignOutItem />}
            </DropdownMenuContent>
          </DropdownMenu>
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
