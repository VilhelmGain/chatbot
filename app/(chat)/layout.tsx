import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/chat/app-sidebar";
import { ChatShellWrapper } from "@/components/chat/chat-shell-wrapper";
import { DataStreamProvider } from "@/components/chat/data-stream-provider";
import { PreferencesSync } from "@/components/preferences-sync";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ActiveChatProvider } from "@/hooks/use-active-chat";
import { isTestEnvironmentNow } from "@/lib/constants";
import { auth } from "../(auth)/auth";

function isClerkConfiguredNow(): boolean {
  return (
    Boolean(process.env.CLERK_SECRET_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  );
}

export const metadata: Metadata = {
  robots: {
    follow: true,
    index: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        position="top-center"
        theme="system"
        toastOptions={{
          className:
            "!rounded-lg !bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
          style: { fontFamily: "var(--app-font-label)" },
        }}
      />
      <DataStreamProvider>
        <Suspense fallback={<div className="flex h-dvh bg-sidebar" />}>
          <SidebarShell>{children}</SidebarShell>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function SidebarShell({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  const useTestAuth =
    isTestEnvironmentNow() ||
    !isClerkConfiguredNow() ||
    !process.env.POSTGRES_URL ||
    process.env.VERCEL_ENV === "preview";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar testEnvironment={useTestAuth} user={session?.user} />
      <SidebarInset>
        <Suspense fallback={<div className="flex h-dvh" />}>
          <ActiveChatProvider>
            <PreferencesSync />
            <ChatShellWrapper />
          </ActiveChatProvider>
        </Suspense>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
