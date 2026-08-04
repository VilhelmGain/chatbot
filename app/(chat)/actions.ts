"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getLanguageModel, getTitleModel } from "@/lib/ai/providers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function saveTitleModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("title-model", model);
}

async function getTitleModelId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("title-model")?.value;
}

export async function generateTitleFromUserMessage({
  message,
  chatModelId,
}: {
  message: UIMessage;
  chatModelId?: string;
}) {
  try {
    const titleModelId = await getTitleModelId();
    const model = titleModelId
      ? await getLanguageModel(titleModelId)
      : chatModelId
        ? await getLanguageModel(chatModelId)
        : await getTitleModel();

    const { text } = await generateText({
      instructions: titlePrompt,
      model,
      prompt: getTextFromMessage(message),
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
