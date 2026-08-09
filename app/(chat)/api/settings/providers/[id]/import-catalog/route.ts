import { auth } from "@/app/(auth)/auth";
import { getCatalogModelsForProvider } from "@/lib/ai/catalog";
import {
  createCustomModels,
  getCustomModelsByProviderId,
  getCustomProviderById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  const { id } = await params;
  const provider = await getCustomProviderById({ id });

  if (!provider || provider.userId !== session.user.id) {
    return new ChatbotError("not_found:provider").toResponse();
  }

  if (!provider.providerKey) {
    return Response.json(
      { error: "Provider is not linked to a catalog entry." },
      { status: 400 }
    );
  }

  const catalogModels = getCatalogModelsForProvider(provider.providerKey);
  if (catalogModels.length === 0) {
    return Response.json(
      { error: "No models found in catalog for this provider." },
      { status: 404 }
    );
  }

  const existingModels = await getCustomModelsByProviderId({ providerId: id });
  const existingModelIds = new Set(existingModels.map((m) => m.modelId));

  const newModels = catalogModels.filter(
    (m) => !existingModelIds.has(m.modelId)
  );

  if (newModels.length === 0) {
    return Response.json({ imported: 0, models: [] });
  }

  const created = await createCustomModels({
    models: newModels,
    providerId: id,
  });

  return Response.json({
    imported: created.length,
    models: created,
  });
}
