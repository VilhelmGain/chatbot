import { auth } from "@/app/(auth)/auth";
import {
  createCustomModels,
  getCustomProviderById,
  getDecryptedApiKey,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || session.user.type === "guest") {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  const { id } = await params;
  const provider = await getCustomProviderById({ id });

  if (!provider || provider.userId !== session.user.id) {
    return new ChatbotError("not_found:provider").toResponse();
  }

  if (provider.type !== "openai") {
    return Response.json(
      {
        error:
          "Auto-detection is only supported for OpenAI-compatible endpoints.",
      },
      { status: 400 }
    );
  }

  const apiKey = await getDecryptedApiKey({ providerId: id });
  const normalizedBaseURL = provider.baseURL.replace(/\/$/, "");

  try {
    const response = await fetch(`${normalizedBaseURL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return Response.json(
        {
          error: `Failed to fetch models: ${response.status} ${response.statusText}`,
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    const models = data.data ?? [];

    const modelEntries = models.map((m: { id: string }) => ({
      capabilities: {
        reasoning: false,
        tools: true,
        vision: false,
      },
      modelId: m.id,
      name: m.id,
    }));

    const created = await createCustomModels({
      models: modelEntries,
      providerId: id,
    });

    return Response.json({
      detected: created.length,
      models: created,
    });
  } catch (error) {
    console.error("Provider auto-detect failed:", error);
    let message = "Failed to detect models.";
    if (error instanceof ChatbotError) {
      message = error.cause ? `${error.message} ${error.cause}` : error.message;
    } else if (error instanceof Error) {
      message = `Failed to detect models: ${error.message}`;
    }
    return Response.json(
      {
        error: message,
      },
      { status: 400 }
    );
  }
}
