import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  deleteCustomModel,
  getCustomProviderById,
  updateCustomModel,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const updateModelSchema = z.object({
  capabilities: z
    .object({
      reasoning: z.boolean(),
      reasoningEfforts: z.array(z.string()).optional(),
      tools: z.boolean(),
      vision: z.boolean(),
    })
    .optional(),
  name: z.string().min(1).max(256).optional(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  const { id, modelId } = await params;
  const provider = await getCustomProviderById({ id });

  if (!provider || provider.userId !== session.user.id) {
    return new ChatbotError("not_found:provider").toResponse();
  }

  await deleteCustomModel({ id: modelId, providerId: id });

  return new Response(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  const { id, modelId } = await params;
  const provider = await getCustomProviderById({ id });

  if (!provider || provider.userId !== session.user.id) {
    return new ChatbotError("not_found:provider").toResponse();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new ChatbotError("bad_request:provider").toResponse();
  }

  const parsed = updateModelSchema.safeParse(json);
  if (!parsed.success) {
    return new ChatbotError("bad_request:provider").toResponse();
  }

  const updated = await updateCustomModel({
    capabilities: parsed.data.capabilities,
    id: modelId,
    name: parsed.data.name,
    providerId: id,
  });

  return Response.json(updated);
}
