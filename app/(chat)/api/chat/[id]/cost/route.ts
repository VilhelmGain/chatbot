import { auth } from "@/app/(auth)/auth";
import { calculateUsageCost, getModelPricing } from "@/lib/ai/pricing";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const { id } = await params;
  const chat = await getChatById({ id });
  if (!chat || chat.userId !== session.user.id) {
    return new ChatbotError("not_found:chat").toResponse();
  }

  const messages = await getMessagesByChatId({ id });
  const costs = await Promise.all(
    messages
      .filter((message) => message.role === "assistant")
      .map(async (message) => {
        const metadata = message.metadata as {
          cacheHitInputTokens?: number;
          cacheMissInputTokens?: number;
          cost?: unknown;
          inputTokens?: number;
          modelId?: string;
          outputTokens?: number;
          reasoningTokens?: number;
        };
        if (
          typeof metadata.cost === "number" &&
          Number.isFinite(metadata.cost)
        ) {
          return metadata.cost;
        }
        return calculateUsageCost(
          metadata,
          await getModelPricing(metadata.modelId)
        );
      })
  );
  const pricedCosts = costs.filter((cost): cost is number => cost !== null);

  return Response.json({
    pricedMessages: pricedCosts.length,
    total: pricedCosts.reduce((sum, cost) => sum + cost, 0),
    unavailableMessages: costs.length - pricedCosts.length,
  });
}
