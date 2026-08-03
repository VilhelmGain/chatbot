import { auth } from "@/app/(auth)/auth";
import { getCustomProviderById, getDecryptedApiKey } from "@/lib/db/queries";
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

  const apiKey = await getDecryptedApiKey({ providerId: id });

  try {
    if (provider.type === "openai") {
      const response = await fetch(`${provider.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return Response.json(
          {
            error: `Connection failed: ${response.status} ${response.statusText}`,
            success: false,
          },
          { status: 400 }
        );
      }

      const data = await response.json();
      const modelCount = data.data?.length ?? 0;

      return Response.json({
        message: `Connection successful. Found ${modelCount} model(s).`,
        modelCount,
        success: true,
      });
    }

    if (provider.type === "anthropic") {
      const response = await fetch(`${provider.baseURL}/messages`, {
        body: JSON.stringify({
          max_tokens: 1,
          messages: [{ content: "Hi", role: "user" }],
          model: "claude-3-haiku-20240307",
        }),
        headers: {
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        return Response.json(
          {
            error: `Connection failed: ${response.status} ${response.statusText}. ${errorText}`,
            success: false,
          },
          { status: 400 }
        );
      }

      return Response.json({
        message: "Connection successful.",
        success: true,
      });
    }

    return new ChatbotError("bad_request:provider").toResponse();
  } catch (error) {
    return Response.json(
      {
        error: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        success: false,
      },
      { status: 400 }
    );
  }
}
