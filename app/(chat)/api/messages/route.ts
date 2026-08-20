import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { checkMessagesRateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/server/request-utils";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return Response.json({ error: "chatId required" }, { status: 400 });
  }

  if (!z.string().uuid().safeParse(chatId).success) {
    return Response.json({ error: "invalid chatId" }, { status: 400 });
  }

  const session = await auth();
  if (session?.user) {
    try {
      await checkMessagesRateLimit(getClientIp(request), session.user.id);
    } catch (error) {
      if (error instanceof ChatbotError) {
        return error.toResponse();
      }
      throw error;
    }
  }
  const [chat, messages] = await Promise.all([
    getChatById({ id: chatId }),
    getMessagesByChatId({ id: chatId }),
  ]);

  if (!chat) {
    return Response.json({
      isReadonly: false,
      messages: [],
      userId: null,
      visibility: "private",
    });
  }

  if (
    chat.visibility === "private" &&
    (!session?.user || session.user.id !== chat.userId)
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const isReadonly = !session?.user || session.user.id !== chat.userId;

  return Response.json({
    isReadonly,
    messages: convertToUIMessages(messages),
    userId: chat.userId,
    visibility: chat.visibility,
  });
}
