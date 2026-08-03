import { auth } from "@/app/(auth)/auth";
import {
  chatModels,
  getCapabilities,
  getCustomCapabilitiesForUser,
  getCustomModelsForUser,
} from "@/lib/ai/models";

export async function GET() {
  const session = await auth();
  const builtinCapabilities = getCapabilities();
  const builtinModels = chatModels;

  if (!session?.user || session.user.type === "guest") {
    return Response.json(
      { capabilities: builtinCapabilities, models: builtinModels },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  }

  const customModels = await getCustomModelsForUser(session.user.id);
  const customCapabilities = await getCustomCapabilitiesForUser(
    session.user.id
  );

  return Response.json(
    {
      capabilities: { ...builtinCapabilities, ...customCapabilities },
      models: [...builtinModels, ...customModels],
    },
    { headers: { "Cache-Control": "no-cache" } }
  );
}
