"use client";

import { useClerk } from "@clerk/nextjs";
import { ChevronUp, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import type { User } from "@/app/(auth)/auth";
import { signOut } from "@/app/(chat)/actions";
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
import { isTestEnvironment } from "@/lib/constants";

function emailToHue(email: string): number {
  let hash = 0;
  for (const char of email) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

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

export function SidebarUserNav({ user }: { user: User }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-8 px-2 rounded-lg bg-transparent text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              data-testid="user-nav-button"
            >
              <div
                className="size-5 shrink-0 rounded-full ring-1 ring-sidebar-border/50"
                style={{
                  background: `linear-gradient(135deg, oklch(0.35 0.08 ${emailToHue(user.email ?? "")}), oklch(0.25 0.05 ${emailToHue(user.email ?? "") + 40}))`,
                }}
              />
              <span className="truncate text-[13px]" data-testid="user-email">
                {user.email}
              </span>
              <ChevronUp className="ml-auto size-3.5 text-sidebar-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-popper-anchor-width) rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)]"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                className="flex cursor-pointer items-center text-[13px]"
                href="/settings"
              >
                <Settings className="mr-2 size-3.5" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isTestEnvironment ? <TestSignOutItem /> : <ClerkSignOutItem />}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
