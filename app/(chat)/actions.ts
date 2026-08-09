"use server";

import { auth as clerkAuth, clerkClient } from "@clerk/nextjs/server";
import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import {
  getCustomCapabilitiesForUser,
  type ReasoningEffort,
} from "@/lib/ai/models";
import { titlePrompt } from "@/lib/ai/prompts";
import {
  getCustomProviderOptionsKey,
  getLanguageModel,
  isOpenAICompatibleProvider,
} from "@/lib/ai/providers";
import { isTestEnvironment } from "@/lib/constants";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getCustomProviderById,
  getMessageById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import type { VisibilityType } from "@/lib/types";
import { generateUUID, getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}
export async function saveReasoningEffortAsCookie(effort: string) {
  const cookieStore = await cookies();
  cookieStore.set("reasoning-effort", effort, {
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function saveTitleModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("title-model", model);
}

export async function signOut() {
  if (isTestEnvironment) {
    const cookieStore = await cookies();
    cookieStore.delete("test-user");
    redirect("/");
  }

  const { sessionId } = await clerkAuth();
  if (sessionId) {
    await (await clerkClient()).sessions.revokeSession(sessionId);
  }

  redirect("/");
}

async function getTitleModelId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("title-model")?.value;
}

async function getTitleReasoningEffort(): Promise<ReasoningEffort | undefined> {
  const cookieStore = await cookies();
  const value = cookieStore.get("title-reasoning-effort")?.value;
  return value && value !== "default" ? (value as ReasoningEffort) : undefined;
}

export async function generateTitleFromUserMessage({
  message,
  chatModelId,
  reasoningEffort,
  userId,
}: {
  message: UIMessage;
  chatModelId?: string;
  reasoningEffort?: ReasoningEffort;
  userId?: string;
}) {
  try {
    const titleModelId = await getTitleModelId();
    const titleReasoningEffort = await getTitleReasoningEffort();

    const usesTitleModel = Boolean(titleModelId);
    const modelId = titleModelId || chatModelId;
    if (!modelId) {
      return "New chat";
    }

    const model = await getLanguageModel(modelId);
    if (!model) {
      return "New chat";
    }

    // When no explicit title model is set, fall back to the active chat model
    // and honor the reasoning effort sent with the chat request.
    const effort = usesTitleModel ? titleReasoningEffort : reasoningEffort;

    let reasoningValue:
      | "none"
      | "minimal"
      | "low"
      | "medium"
      | "high"
      | "xhigh"
      | undefined;
    let providerOptions:
      | Record<string, { reasoningEffort: string }>
      | undefined;

    if (effort && effort !== "default") {
      const capabilities = userId
        ? await getCustomCapabilitiesForUser(userId)
        : undefined;
      const isReasoningModel = capabilities?.[modelId]?.reasoning === true;

      if (isReasoningModel) {
        if (effort !== "max") {
          reasoningValue = effort;
        }
        const providerId = modelId.split("/")[0].slice(7);
        const provider = await getCustomProviderById({ id: providerId });
        if (provider && isOpenAICompatibleProvider(provider)) {
          providerOptions = {
            [getCustomProviderOptionsKey(provider)]: {
              reasoningEffort: effort,
            },
          };
        }
      }
    }

    const { text } = await generateText({
      instructions: titlePrompt,
      model,
      prompt: getTextFromMessage(message),
      ...(reasoningValue ? { reasoning: reasoningValue } : {}),
      ...(providerOptions ? { providerOptions } : {}),
    });

    return text
      .replace(/^[#*"\s]+/, "")
      .replace(/["]+$/, "")
      .trim();
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return "New chat";
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [message] = await getMessageById({ id });
  if (!message) {
    throw new Error("Message not found");
  }

  const chat = await getChatById({ id: message.chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await updateChatVisibilityById({ chatId, visibility });
}

export async function forkChat({
  chatId,
  branchMessageId,
}: {
  chatId: string;
  branchMessageId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [sourceChat, messages] = await Promise.all([
    getChatById({ id: chatId }),
    getMessagesByChatId({ id: chatId }),
  ]);

  if (!sourceChat || sourceChat.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  const branchIndex = messages.findIndex(
    (currentMessage) => currentMessage.id === branchMessageId
  );
  if (branchIndex === -1) {
    throw new Error("Message not found");
  }

  const forkedChatId = generateUUID();

  await saveChat({
    id: forkedChatId,
    title: sourceChat.title,
    userId: session.user.id,
    visibility: sourceChat.visibility,
  });

  const messagesToCopy = messages.slice(0, branchIndex + 1);
  await saveMessages({
    messages: messagesToCopy.map((currentMessage) => ({
      ...currentMessage,
      chatId: forkedChatId,
      id: generateUUID(),
    })),
  });

  return { chatId: forkedChatId };
}
