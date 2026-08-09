"use client";

import { UserProfile } from "@clerk/nextjs";
import { useEffect } from "react";
import type { User } from "@/app/(auth)/auth";
import { UserAvatar } from "@/components/chat/user-avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isTestEnvironment } from "@/lib/constants";

const PROFILE_APPEARANCE = {
  elements: {
    card: "h-full w-full",
    cardBox: "h-full w-full max-h-full rounded-none border-0 shadow-none",
    rootBox: "h-full w-full",
  },
};

export function AccountDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    if (open) {
      return;
    }
    if (window.location.hash.startsWith("#/")) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="h-[min(80vh,700px)] w-full max-w-3xl! gap-0 overflow-hidden p-0"
        data-testid="account-dialog"
        showCloseButton={isTestEnvironment}
      >
        <DialogTitle className="sr-only">Account</DialogTitle>
        {isTestEnvironment ? (
          <TestAccountPanel user={user} />
        ) : (
          <UserProfile
            appearance={PROFILE_APPEARANCE}
            fallback={
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Loading account&hellip;
              </div>
            }
            routing="hash"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TestAccountPanel({ user }: { user: User }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center"
      data-testid="account-dialog-fallback"
    >
      <UserAvatar
        className="size-16"
        email={user.email ?? ""}
        src={user.image}
      />
      <div className="flex flex-col gap-1">
        {user.name ? <p className="font-medium">{user.name}</p> : null}
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Account management is not available in test mode.
      </p>
    </div>
  );
}
