import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

// Only safe types are served with their native Content-Type.
// Dangerous types (html/js/xml) are forced to a safe type and served as attachment.
const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  md: "text/markdown",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain",
  webp: "image/webp",
  yaml: "application/yaml",
  yml: "application/yaml",
};

const DANGEROUS_EXTS = new Set(["html", "htm", "js", "ts", "xml", "xhtml"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Block access to metadata sidecars and empty names
  if (
    !safeName ||
    safeName.endsWith(".meta.json") ||
    safeName.includes(".meta")
  ) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const uploadDir = join(process.cwd(), UPLOAD_DIR);
  const filePath = join(uploadDir, safeName);

  // Prevent path traversal: filePath must stay inside uploadDir
  if (!filePath.startsWith(uploadDir)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Ownership check via sidecar metadata
  const metaPath = join(uploadDir, ".meta", `${safeName}.json`);
  try {
    const metaRaw = await readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw) as { userId?: string };
    if (!meta.userId || meta.userId !== session.user.id) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    // No metadata -> deny. This also covers legacy files without ownership.
    // Fall back to message-ownership check for files that were attached to a
    // message before the metadata sidecar was introduced.
    try {
      const { getAllMessagesByUserId } = await import("@/lib/db/queries");
      const messages = await getAllMessagesByUserId({
        userId: session.user.id,
      });
      const owned = messages.some((m) => {
        const parts = m.parts as unknown[];
        if (!Array.isArray(parts)) return false;
        return parts.some((p) => {
          if (typeof p !== "object" || p === null) return false;
          const url = (p as { url?: unknown }).url;
          return typeof url === "string" && url.includes(safeName);
        });
      });
      if (!owned) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  try {
    const data = await readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const isDangerous = DANGEROUS_EXTS.has(ext);
    const contentType = isDangerous
      ? "text/plain; charset=utf-8"
      : (CONTENT_TYPES[ext] ?? "application/octet-stream");

    const headers: Record<string, string> = {
      "Cache-Control": "private, no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    };

    if (isDangerous) {
      headers["Content-Disposition"] = `attachment; filename="${safeName}"`;
    }

    return new Response(data, { headers });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
