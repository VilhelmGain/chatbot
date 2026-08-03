import { auth } from "@/app/(auth)/auth";
import { deleteCustomModel, getCustomProviderById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const session = await auth();

  if (!session?.user || session.user.type === "guest") {
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
