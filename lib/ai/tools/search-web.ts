import { tool } from "ai";
import { z } from "zod";
import type { SearchProvider } from "./metadata";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";

export function searchWeb({
  apiKey,
  provider = "tavily",
}: {
  apiKey: string;
  provider?: SearchProvider;
}) {
  if (provider !== "tavily") {
    throw new Error(`Unsupported web search provider: ${provider}`);
  }

  return tool({
    description:
      "Search the web for current, up-to-date information. Use this when you need facts, news, or details that may be newer than your training data.",
    execute: async ({ maxResults, query }) => {
      try {
        const response = await fetch(TAVILY_SEARCH_ENDPOINT, {
          body: JSON.stringify({
            api_key: apiKey,
            include_answer: true,
            max_results: maxResults ?? 5,
            query,
            search_depth: "basic",
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          return {
            error: `Web search failed (HTTP ${response.status}). Please try again later.`,
          };
        }

        const data = await response.json();

        return {
          answer: data.answer,
          query: data.query,
          results: (data.results ?? []).map(
            (result: { content: string; title: string; url: string }) => ({
              content: result.content,
              title: result.title,
              url: result.url,
            })
          ),
        };
      } catch {
        return {
          error: "Web search failed. Please try again.",
        };
      }
    },
    inputSchema: z.object({
      maxResults: z.number().int().min(1).max(10).optional(),
      query: z.string().describe("The search query."),
    }),
  });
}
