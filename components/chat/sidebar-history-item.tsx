import Link from "next/link";
import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatTitle } from "@/hooks/use-chat-title";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Chat } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  SidebarInput,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  LockIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
  ShareIcon,
  SparklesIcon,
  TrashIcon,
} from "./icons";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibilityType: chat.visibility,
  });
  const { title, setTitle, regenerateTitle } = useChatTitle({
    chatId: chat.id,
    initialTitle: chat.title,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const saveGuardRef = useRef(false);
  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleShare = useCallback(async () => {
    setVisibilityType("public");
    const shareUrl = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chat.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [chat.id, setVisibilityType]);

  const handleSetPrivate = useCallback(() => {
    setVisibilityType("private");
    toast.success("Chat is now private");
  }, [setVisibilityType]);

  const handleDelete = useCallback(() => {
    onDelete(chat.id);
  }, [chat.id, onDelete]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const startEditing = useCallback(() => {
    saveGuardRef.current = false;
    setDraftTitle(title);
    setIsEditing(true);
  }, [title]);

  const handleTitleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      startEditing();
    },
    [startEditing]
  );

  const handleRenameSelect = useCallback(() => {
    requestAnimationFrame(startEditing);
  }, [startEditing]);

  const handleSave = useCallback(() => {
    if (saveGuardRef.current) {
      return;
    }
    saveGuardRef.current = true;
    const trimmedTitle = draftTitle.trim();
    if (trimmedTitle) {
      setTitle(trimmedTitle).catch(() => {
        toast.error("Failed to rename chat");
      });
    }
    stopEditing();
  }, [draftTitle, setTitle, stopEditing]);

  const handleCancel = useCallback(() => {
    saveGuardRef.current = true;
    stopEditing();
  }, [stopEditing]);

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraftTitle(event.target.value);
    },
    []
  );

  const handleTitleFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      event.currentTarget.select();
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    },
    [handleCancel, handleSave]
  );

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    try {
      await regenerateTitle();
      toast.success("Title regenerated");
    } catch {
      toast.error("Failed to regenerate title");
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateTitle]);

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <SidebarInput
          autoFocus
          className={cn(
            "h-8 rounded-lg border-none bg-transparent px-2.5 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-sidebar-primary/50",
            isActive && "bg-sidebar-primary/5"
          )}
          data-testid="chat-title-input"
          onBlur={handleSave}
          onChange={handleTitleChange}
          onFocus={handleTitleFocus}
          onKeyDown={handleKeyDown}
          value={draftTitle}
        />
      ) : (
        <SidebarMenuButton
          asChild
          className="h-8 rounded-lg text-[13px] text-sidebar-foreground/45 transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-sidebar-primary/10 hover:text-sidebar-primary hover:shadow-[0_0_16px_rgba(0,240,255,0.12)]"
        >
          <Link
            href={`/chat/${chat.id}`}
            onClick={closeMobile}
            onDoubleClick={handleTitleDoubleClick}
          >
            <span className="truncate">{title}</span>
          </Link>
        </SidebarMenuButton>
      )}

      {!isEditing && (
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="mr-0.5 rounded-md text-sidebar-foreground/50 ring-0 transition-colors duration-150 focus-visible:ring-0 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleRenameSelect}
            >
              <PencilEditIcon />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isRegenerating}
              onSelect={handleRegenerate}
            >
              <SparklesIcon />
              <span>
                {isRegenerating ? "Regenerating title…" : "Regenerate title"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleShare}>
              <ShareIcon />
              <span>Share</span>
            </DropdownMenuItem>
            {visibilityType === "public" && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleSetPrivate}
              >
                <LockIcon />
                <span>Make private</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleDelete} variant="destructive">
              <TrashIcon />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});
