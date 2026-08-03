import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  createCustomProvider,
  getCustomProvidersByUserId,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const createProviderSchema = z.object({
  apiKey: z.string().min(1),
  baseURL: z.string().url().max(512),
  name: z.string().min(1).max(128),
  type: z.enum(["openai", "anthropic"]),
});

export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.type === "guest") {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  const providers = await getCustomProvidersByUserId({
    userId: session.user.id,
  });

  return Response.json(providers);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.type === "guest") {
    return new ChatbotError("unauthorized:provider").toResponse();
  }

  let body: z.infer<typeof createProviderSchema>;

  try {
    const json = await request.json();
    body = createProviderSchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:provider").toResponse();
  }

  const provider = await createCustomProvider({
    apiKey: body.apiKey,
    baseURL: body.baseURL,
    name: body.name,
    type: body.type,
    userId: session.user.id,
  });

  return Response.json(
    {
      baseURL: provider.baseURL,
      createdAt: provider.createdAt,
      id: provider.id,
      name: provider.name,
      type: provider.type,
      updatedAt: provider.updatedAt,
      userId: provider.userId,
    },
    { status: 201 }
  );
}
