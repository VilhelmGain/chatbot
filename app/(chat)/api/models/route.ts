import { auth } from "@/app/(auth)/auth";
import {
  getCustomCapabilitiesForUser,
  getCustomModelsForUser,
  getProviderNamesForUser,
} from "@/lib/ai/models";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      { capabilities: {}, models: [], providerNames: {} },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
    );
  }

  const customModels = await getCustomModelsForUser(session.user.id);
  const customCapabilities = await getCustomCapabilitiesForUser(
    session.user.id
  );
  const providerNames = await getProviderNamesForUser(session.user.id);

  return Response.json(
    {
      capabilities: customCapabilities,
      models: customModels,
      providerNames,
    },
    { headers: { "Cache-Control": "no-cache" } }
  );
}
