"use client";

import { ExternalLink, Globe } from "lucide-react";

type WebSearchResult = {
  content: string;
  title: string;
  url: string;
};

export function WebSearchResults({
  answer,
  query,
  results,
}: {
  answer?: string;
  query: string;
  results: WebSearchResult[];
}) {
  return (
    <div className="w-full rounded-lg border border-border bg-foreground/5">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {query}
        </p>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {results.length} result{results.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {answer ? (
          <p className="text-[13px] leading-[1.65] text-foreground">{answer}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          {results.map((result) => (
            <a
              className="group flex min-w-0 flex-col gap-0.5 rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-primary/30"
              href={result.url}
              key={result.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground group-hover:text-primary">
                  {result.title}
                </span>
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {result.url}
              </span>
              {result.content ? (
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {result.content}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
