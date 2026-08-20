import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";

function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

// Only safe types are served with their native Content-Type.
// Dangerous types (html/js/xml/svg) are forced to a safe type and served as attachment.
const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  md: "text/markdown",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  webp: "image/webp",
  yaml: "application/yaml",
  yml: "application/yaml",
};

const DANGEROUS_EXTS = new Set([
  "html",
  "htm",
  "js",
  "ts",
  "xml",
  "xhtml",
  "svg",
]);

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
  if (!safeName || safeName.endsWith(".meta.json")) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const uploadDir = join(process.cwd(), getUploadDir());
  const filePath = join(uploadDir, safeName);

  // Prevent path traversal: filePath must stay inside uploadDir
  if (!filePath.startsWith(uploadDir)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Ownership check via sidecar metadata
  const metaPath = join(uploadDir, ".meta", `${safeName}.json`);
  let isOwner = false;
  let metaExists = false;
  try {
    const metaRaw = await readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw) as { userId?: string };
    metaExists = true;
    if (meta.userId && meta.userId === session.user.id) {
      isOwner = true;
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    // No metadata -> fall back to message-ownership check for legacy files
    try {
      const { getAllMessagesByUserId } = await import("@/lib/db/queries");
      const messages = await getAllMessagesByUserId({
        userId: session.user.id,
      });
      const owned = messages.some((m) => {
        const parts = m.parts as unknown[];
        if (!Array.isArray(parts)) {
          return false;
        }
        return parts.some((p) => {
          if (typeof p !== "object" || p === null) {
            return false;
          }
          const { url } = p as { url?: unknown };
          if (typeof url !== "string") {
            return false;
          }
          try {
            const base = basename(new URL(url, "http://local").pathname);
            return base === safeName;
          } catch {
            return false;
          }
        });
      });
      if (owned) {
        isOwner = true;
      }
    } catch {
      // ignore, will handle missing .meta below
    }
  }

  // Handle missing .meta for owner before message exists:
  // New uploads have a sidecar, but if the sidecar is missing (e.g. write
  // race) the owner should still be able to fetch the file immediately after
  // upload, before any message references it. Only allow this for recent
  // files to avoid letting any user claim legacy files.
  if (!isOwner && !metaExists) {
    try {
      const fileStat = await stat(filePath);
      const ageMs = Date.now() - fileStat.mtimeMs;
      const isRecent = ageMs < 10 * 60 * 1000;
      if (!isRecent) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      isOwner = true;
      try {
        const { mkdir } = await import("node:fs/promises");
        await mkdir(join(uploadDir, ".meta"), { recursive: true });
        await writeFile(
          metaPath,
          JSON.stringify({
            createdAt: new Date().toISOString(),
            safeName,
            userId: session.user.id,
          })
        );
      } catch {
        // best-effort
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  if (!isOwner) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
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
