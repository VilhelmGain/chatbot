import { auth } from "@/app/(auth)/auth";
import {
  discoverProviderModels,
  getAvailableBuiltinModels,
  getCapabilities,
  getCustomCapabilitiesForUser,
  getCustomModelsForUser,
} from "@/lib/ai/models";

export async function GET() {
  const session = await auth();
  const availableBuiltin = getAvailableBuiltinModels();
  const builtinCapabilities = getCapabilities();

  const availableBuiltinIds = new Set(availableBuiltin.map((m) => m.id));
  const filteredBuiltinCapabilities = Object.fromEntries(
    Object.entries(builtinCapabilities).filter(([id]) =>
      availableBuiltinIds.has(id)
    )
  );

  const { models: discoveredModels, capabilities: discoveredCapabilities } =
    await discoverProviderModels();

  const allBuiltinModels = [...availableBuiltin, ...discoveredModels];
  const allBuiltinCapabilities = {
    ...filteredBuiltinCapabilities,
    ...discoveredCapabilities,
  };

  if (!session?.user || session.user.type === "guest") {
    return Response.json(
      { capabilities: allBuiltinCapabilities, models: allBuiltinModels },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
    );
  }

  const customModels = await getCustomModelsForUser(session.user.id);
  const customCapabilities = await getCustomCapabilitiesForUser(
    session.user.id
  );

  return Response.json(
    {
      capabilities: { ...allBuiltinCapabilities, ...customCapabilities },
      models: [...allBuiltinModels, ...customModels],
    },
    { headers: { "Cache-Control": "no-cache" } }
  );
}
