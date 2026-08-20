import { format } from "date-fns";
import { zipSync } from "fflate";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getAllMessagesByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  buildManifest,
  collectAttachments,
  readLocalAttachment,
  uniqueZipPath,
} from "@/lib/export/attachments";
import { checkExportRateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/server/request-utils";

const exportAttachmentsBodySchema = z.object({
  attachmentIds: z.array(z.string()).optional(),
});

/**
 * List every file attachment the user has uploaded across all their chats,
 * newest first. Attachment identity is the file URL, which is unique per
 * upload.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const messages = await getAllMessagesByUserId({ userId: session.user.id });
  const attachments = collectAttachments(messages).reverse();

  return Response.json({ attachments });
}

/**
 * Bundle the selected (or all) attachments into a zip archive. Local files are
 * read from disk; files that are gone or hosted externally are skipped and
 * listed in the archive's README.md instead.
 */
export async function POST(request: Request) {
  let attachmentIds: string[] | undefined;

  try {
    const body = await request.json();
    ({ attachmentIds } = exportAttachmentsBodySchema.parse(body));
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  try {
    await checkExportRateLimit(getClientIp(request), session.user.id);
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    throw error;
  }

  const messages = await getAllMessagesByUserId({ userId: session.user.id });
  const attachments = collectAttachments(messages);

  const selected = attachmentIds?.length
    ? attachments.filter((attachment) => attachmentIds.includes(attachment.id))
    : attachments;

  const files: Record<string, Uint8Array> = {};
  const usedPaths = new Set<string>();
  const included: Array<{
    chatTitle: string;
    messageCreatedAt: string;
    path: string;
  }> = [];
  const excluded: Array<{ name: string; reason: string; url: string }> = [];

  const readResults = await Promise.all(
    selected.map(async (attachment) => ({
      attachment,
      result: await readLocalAttachment(attachment.url),
    }))
  );

  for (const { attachment, result } of readResults) {
    if (result.status !== "ok") {
      excluded.push({
        name: attachment.name,
        reason: result.status === "external" ? "external URL" : "missing file",
        url: attachment.url,
      });
      continue;
    }

    const path = uniqueZipPath(
      attachment.chatTitle,
      attachment.name,
      usedPaths
    );
    files[path] = result.data;
    included.push({
      chatTitle: attachment.chatTitle,
      messageCreatedAt: attachment.messageCreatedAt,
      path,
    });
  }

  const exportedAt = new Date();
  files["README.md"] = new TextEncoder().encode(
    buildManifest({
      excluded,
      exportedAt,
      files: included,
      totalSelected: selected.length,
    })
  );

  const zipped = zipSync(files);
  const date = format(exportedAt, "yyyy-MM-dd");

  return new Response(new Blob([zipped]), {
    headers: {
      "Content-Disposition": `attachment; filename="chatbot-attachments-${date}.zip"`,
      "Content-Type": "application/zip",
      "X-Exported-Count": String(included.length),
    },
  });
}
