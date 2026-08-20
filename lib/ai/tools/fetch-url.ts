import { tool } from "ai";
import { z } from "zod";
import { assertPublicUrl } from "@/lib/security/ssrf";

const MAX_CONTENT_LENGTH = 20_000;
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#x")) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      if (entity.startsWith("#")) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    }
  );
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, "").trim()) : "";
}

function htmlToText(html: string): string {
  const withoutNonContent = html.replace(
    /<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );
  const withBreaks = withoutNonContent
    .replace(
      /<\/(p|div|li|ul|ol|h[1-6]|tr|section|article|blockquote|pre|table)>/gi,
      "\n"
    )
    .replace(/<br\s*\/?>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");

  return decodeEntities(withoutTags)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const fetchUrl = tool({
  description:
    "Fetch and read the content of a single web page by URL. Use this when you need the actual text of a specific page, such as an article, documentation page, or blog post. For finding pages, use searchWeb instead.",
  execute: async ({ url }) => {
    try {
      const validatedUrl = await assertPublicUrl(url);

      const response = await fetch(validatedUrl, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        return {
          error: `Failed to fetch the page (HTTP ${response.status}).`,
        };
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isHtml =
        contentType.includes("text/html") ||
        contentType.includes("application/xhtml");

      const raw = await response.text();
      const content = isHtml
        ? htmlToText(raw)
        : raw.replace(/\s+/g, " ").trim();

      if (!content) {
        return { error: "The page returned no readable text content." };
      }

      return {
        content:
          content.length > MAX_CONTENT_LENGTH
            ? `${content.slice(0, MAX_CONTENT_LENGTH)}…`
            : content,
        contentType: contentType.split(";")[0]?.trim() || "text/html",
        title: isHtml ? extractTitle(raw) : undefined,
        url: response.url || validatedUrl.href,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : "";
      if (message) {
        return { error: message };
      }
      return { error: "Failed to fetch the page. Please try again." };
    }
  },
  inputSchema: z.object({
    url: z
      .string()
      .url()
      .describe(
        "The full URL of the page to fetch, including the scheme (e.g., https://example.com/article)."
      ),
  }),
});
