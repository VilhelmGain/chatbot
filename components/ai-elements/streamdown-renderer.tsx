"use client";

import type { ComponentProps } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

import "katex/dist/katex.min.css";

const streamdownPlugins = { cjk, code, math, mermaid };

export type StreamdownRendererProps = ComponentProps<typeof Streamdown>;

export function StreamdownRenderer({
  className,
  ...props
}: StreamdownRendererProps) {
  return <Streamdown className={className} plugins={streamdownPlugins} {...props} />;
}
