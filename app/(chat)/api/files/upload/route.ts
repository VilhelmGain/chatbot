import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { ALLOWED_MEDIA_TYPES, MAX_FILE_SIZE } from "@/lib/attachments";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size should be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
    })
    .refine((file) => ALLOWED_MEDIA_TYPES.includes(file.type), {
      message: "File type should be an image, PDF, or text file",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = (formData.get("file") as File).name;
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    try {
      const uploadDir = join(process.cwd(), UPLOAD_DIR);
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, safeName);
      await writeFile(filePath, fileBuffer);

      // Persist ownership metadata for authenticated file serving.
      try {
        const metaDir = join(uploadDir, ".meta");
        await mkdir(metaDir, { recursive: true });
        const metaPath = join(metaDir, `${safeName}.json`);
        await writeFile(
          metaPath,
          JSON.stringify({
            contentType: file.type,
            createdAt: new Date().toISOString(),
            originalName: filename.slice(0, 100),
            safeName,
            size: fileBuffer.length,
            userId: session.user.id,
          })
        );
      } catch {
        // Ownership metadata is best-effort; file is already stored.
        // GET will deny access if metadata is missing, so log but don't fail.
        console.error("Failed to write file metadata", { safeName });
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      return NextResponse.json({
        contentType: file.type,
        name: filename.slice(0, 100),
        pathname: safeName,
        size: fileBuffer.length,
        url: `${basePath}/api/files/${safeName}`,
      });
    } catch {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
