export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  reasoningEfforts?: string[];
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  providerKey?: string | null;
  description: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export async function isAllowedModelId(modelId: string): Promise<boolean> {
  if (modelId.startsWith("custom-")) {
    const { getCustomModelsByProviderId } = await import("../db/queries");
    const [providerPart] = modelId.split("/");
    const providerId = providerPart.slice(7);
    const models = await getCustomModelsByProviderId({ providerId });
    const modelName = modelId.split("/").slice(1).join("/");
    return models.some((m) => m.modelId === modelName);
  }

  return false;
}

export async function getCustomModelsForUser(
  userId: string
): Promise<ChatModel[]> {
  const { getCustomModelsByProviderId, getCustomProvidersByUserId } =
    await import("../db/queries");
  const providers = await getCustomProvidersByUserId({ userId });
  const allModels = await Promise.all(
    providers.map(async (provider) => {
      const models = await getCustomModelsByProviderId({
        providerId: provider.id,
      });
      return models.map((model) => ({
        description: `${provider.name} (${provider.type})`,
        id: `custom-${provider.id}/${model.modelId}`,
        name: model.name,
        provider: `custom-${provider.id}`,
        providerKey: provider.providerKey,
      }));
    })
  );

  return allModels.flat();
}

export async function getCustomCapabilitiesForUser(
  userId: string
): Promise<Record<string, ModelCapabilities>> {
  const { getCustomModelsByProviderId, getCustomProvidersByUserId } =
    await import("../db/queries");
  const providers = await getCustomProvidersByUserId({ userId });
  const allEntries = await Promise.all(
    providers.map(async (provider) => {
      const models = await getCustomModelsByProviderId({
        providerId: provider.id,
      });
      return models.map((model) => ({
        key: `custom-${provider.id}/${model.modelId}`,
        value: model.capabilities as ModelCapabilities,
      }));
    })
  );

  return Object.fromEntries(
    allEntries.flat().map(({ key, value }) => [key, value])
  );
}

export async function getProviderNamesForUser(
  userId: string
): Promise<Record<string, string>> {
  const { getCustomProvidersByUserId } = await import("../db/queries");
  const { getCatalogProvider } = await import("./catalog");
  const providers = await getCustomProvidersByUserId({ userId });

  const names: Record<string, string> = {};
  for (const provider of providers) {
    const key = `custom-${provider.id}`;
    if (provider.providerKey) {
      const catalogProvider = getCatalogProvider(provider.providerKey);
      names[key] = catalogProvider?.name ?? provider.name;
    } else {
      names[key] = provider.name;
    }
  }

  return names;
}
