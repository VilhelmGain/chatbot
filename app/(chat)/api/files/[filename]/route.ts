import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  gif: "image/gif",
  html: "text/html",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  md: "text/markdown",
  pdf: "application/pdf",
  png: "image/png",
  ts: "text/x-typescript",
  txt: "text/plain",
  webp: "image/webp",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = join(process.cwd(), UPLOAD_DIR, safeName);

  try {
    const data = await readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new Response(data, {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
