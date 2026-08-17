import { getLiveCatalogModel } from "./catalog";

export type UsageForCost = {
  inputTokens?: number;
  cacheHitInputTokens?: number;
  cacheMissInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
};

export type ModelPricing = NonNullable<
  Awaited<ReturnType<typeof getLiveCatalogModel>>
>["pricing"];

export async function getModelPricing(modelId?: string) {
  if (!modelId) {
    return;
  }
  const [providerKey, ...modelParts] = modelId.split("/");
  if (!providerKey || modelParts.length === 0) {
    return;
  }
  return (await getLiveCatalogModel(providerKey, modelParts.join("/")))
    ?.pricing;
}

export function calculateUsageCost(
  usage: UsageForCost,
  pricing?: ModelPricing
): number | null {
  if (!pricing) {
    return null;
  }
  const input = Math.max(
    0,
    (usage.inputTokens ?? 0) -
      (usage.cacheHitInputTokens ?? 0) -
      (usage.cacheMissInputTokens ?? 0)
  );
  const cacheHit = usage.cacheHitInputTokens ?? 0;
  const cacheMiss = usage.cacheMissInputTokens ?? 0;
  const reasoning = usage.reasoningTokens ?? 0;
  const output = Math.max(0, (usage.outputTokens ?? 0) - reasoning);
  return (
    (input * pricing.input +
      cacheHit * (pricing.cacheRead ?? pricing.input) +
      cacheMiss * pricing.input +
      output * pricing.output +
      reasoning * (pricing.reasoning ?? pricing.output)) /
    1_000_000
  );
}
