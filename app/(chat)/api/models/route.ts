import { auth } from "@/app/(auth)/auth";
import {
  getCustomCapabilitiesForUser,
  getCustomModelsForUser,
} from "@/lib/ai/models";

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.type === "guest") {
    return Response.json(
      { capabilities: {}, models: [] },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } }
    );
  }

  const customModels = await getCustomModelsForUser(session.user.id);
  const customCapabilities = await getCustomCapabilitiesForUser(
    session.user.id
  );

  return Response.json(
    {
      capabilities: customCapabilities,
      models: customModels,
    },
    { headers: { "Cache-Control": "no-cache" } }
  );
}
