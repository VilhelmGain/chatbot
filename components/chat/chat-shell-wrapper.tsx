"use client";

import { usePathname } from "next/navigation";
import { ChatShell } from "./shell";

export function ChatShellWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/settings")) {
    return null;
  }
  return <ChatShell />;
}
