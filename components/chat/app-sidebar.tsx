"use client";

import { PenSquareIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import type { User } from "@/app/(auth)/auth";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

function CollapsedSidebarToggle({ faviconHref }: { faviconHref: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      aria-label="Toggle Sidebar"
      className="size-8 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
      data-testid="sidebar-toggle-button"
      onClick={toggleSidebar}
      size="icon-sm"
      variant="ghost"
    >
      <Image
        alt="Visbyr Chat"
        className="size-4 shrink-0"
        height={16}
        src={faviconHref}
        unoptimized
        width={16}
      />
    </Button>
  );
}

export function AppSidebar({
  testEnvironment,
  user,
}: {
  testEnvironment: boolean;
  user: User | undefined;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [faviconHref, setFaviconHref] = useState(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.png`
  );

  useEffect(() => {
    const href = document
      .querySelector('link[rel="icon"]')
      ?.getAttribute("href");
    if (href) {
      setFaviconHref(href);
    }
  }, []);

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleNewChat = useCallback(() => {
    setOpenMobile(false);
    router.push("/");
  }, [router, setOpenMobile]);

  const handleShowDeleteAllDialog = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("All chats deleted");
  }, [mutate, router]);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarMenuButton
                  asChild
                  className="size-8 !px-0 items-center justify-center"
                  tooltip="Chatbot"
                >
                  <Link href="/" onClick={closeMobile}>
                    <Image
                      alt="Visbyr Chat"
                      className="size-5 shrink-0"
                      height={20}
                      src={faviconHref}
                      unoptimized
                      width={20}
                    />
                  </Link>
                </SidebarMenuButton>
              </div>
              <div className="hidden size-8 items-center justify-center group-data-[collapsible=icon]:flex">
                <CollapsedSidebarToggle faviconHref={faviconHref} />
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-9 rounded-lg border border-input bg-foreground/5 text-[14px] text-sidebar-foreground/80 transition-colors duration-150 hover:bg-primary/10 hover:border-primary/30 hover:text-sidebar-foreground"
                    onClick={handleNewChat}
                    tooltip="New Chat"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">New chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/60 transition-colors duration-150 hover:bg-error/10 hover:text-error"
                      onClick={handleShowDeleteAllDialog}
                      tooltip="Delete All Chats"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[14px]">Delete all</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {user ? (
            <SidebarUserNav testEnvironment={testEnvironment} user={user} />
          ) : null}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent className="glass-surface rounded-lg border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sora text-lg font-semibold">
              Delete all chats?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
