"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type ChatModel = {
  id: string;
  name: string;
  provider: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function setClientCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
}

function getClientCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function TitleModelSelector() {
  const { data, isLoading } = useSWR<{ models: ChatModel[] }>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    fetcher
  );

  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    // document is unavailable during SSR; read the cookie once the client
    // has hydrated.
    setSelected(getClientCookie("title-model") ?? "");
  }, []);

  const handleChange = useCallback((value: string) => {
    setSelected(value);
    setClientCookie("title-model", value);
  }, []);

  useEffect(() => {
    const current = getClientCookie("title-model") ?? "";
    if (current !== selected) {
      setSelected(current);
    }
  }, [selected]);

  if (isLoading) {
    return <Spinner />;
  }

  const models = data?.models ?? [];

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="title-model">Title model</Label>
      <Select onValueChange={handleChange} value={selected}>
        <SelectTrigger id="title-model">
          <SelectValue placeholder="Use active chat model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Use active chat model</SelectItem>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}{" "}
              <span className="text-muted-foreground">({model.provider})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Model used to generate chat titles. If not set, the active chat model is
        used.
      </p>
    </div>
  );
}
