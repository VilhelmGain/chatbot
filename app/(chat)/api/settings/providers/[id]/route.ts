import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { invalidateProviderCache } from "@/lib/ai/providers";
import {
  deleteCustomProvider,
  getCustomProviderById,
  updateCustomProvider,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const updateProviderSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseURL: z.string().url().max(512).optional(),
  name: z.string().min(1).max(128).optional(),
});

export async function GET(
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

  return Response.json({
    baseURL: provider.baseURL,
    createdAt: provider.createdAt,
    id: provider.id,
    name: provider.name,
    type: provider.type,
    updatedAt: provider.updatedAt,
    userId: provider.userId,
  });
}

export async function PUT(
  request: Request,
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

  let body: z.infer<typeof updateProviderSchema>;

  try {
    const json = await request.json();
    body = updateProviderSchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:provider").toResponse();
  }

  try {
    const updated = await updateCustomProvider({
      apiKey: body.apiKey,
      baseURL: body.baseURL,
      id,
      name: body.name,
      userId: session.user.id,
    });

    invalidateProviderCache(id);

    return Response.json({
      baseURL: updated.baseURL,
      createdAt: updated.createdAt,
      id: updated.id,
      name: updated.name,
      type: updated.type,
      updatedAt: updated.updatedAt,
      userId: updated.userId,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    return new ChatbotError("bad_request:provider", {
      cause: error,
    }).toResponse();
  }
}

export async function DELETE(
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

  await deleteCustomProvider({ id, userId: session.user.id });
  invalidateProviderCache(id);

  return new Response(null, { status: 204 });
}
