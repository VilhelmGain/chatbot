import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { CONFIGURABLE_TOOLS, SEARCH_PROVIDERS } from "@/lib/ai/tools/metadata";
import {
  deleteToolConfig,
  getToolConfigByUserId,
  upsertToolConfig,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const upsertToolSchema = z.object({
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean(),
  provider: z.enum(SEARCH_PROVIDERS),
});

const isConfigurableTool = (toolId: string) =>
  (CONFIGURABLE_TOOLS as readonly string[]).includes(toolId);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:tools").toResponse();
  }

  const { toolId } = await params;

  if (!isConfigurableTool(toolId)) {
    return new ChatbotError("bad_request:tools").toResponse();
  }

  let body: z.infer<typeof upsertToolSchema>;

  try {
    const json = await request.json();
    body = upsertToolSchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:tools").toResponse();
  }

  const existing = await getToolConfigByUserId({
    toolId,
    userId: session.user.id,
  });

  if (!existing && body.apiKey === undefined) {
    return new ChatbotError("bad_request:tools").toResponse();
  }

  try {
    const config = await upsertToolConfig({
      apiKey: body.apiKey,
      enabled: body.enabled,
      provider: body.provider,
      toolId,
      userId: session.user.id,
    });

    return Response.json({
      createdAt: config.createdAt,
      enabled: config.enabled,
      id: config.id,
      provider: config.provider,
      toolId: config.toolId,
      updatedAt: config.updatedAt,
      userId: config.userId,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    console.error("Failed to save tool config:", error);
    return new ChatbotError("bad_request:tools", {
      cause: error,
    }).toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:tools").toResponse();
  }

  const { toolId } = await params;

  if (!isConfigurableTool(toolId)) {
    return new ChatbotError("bad_request:tools").toResponse();
  }

  await deleteToolConfig({ toolId, userId: session.user.id });

  return new Response(null, { status: 204 });
}
