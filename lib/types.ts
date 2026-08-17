import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { fetchUrl } from "./ai/tools/fetch-url";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { runPythonTool } from "./ai/tools/run-python";
import type { searchWeb } from "./ai/tools/search-web";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";

export type VisibilityType = "private" | "public";

export const messageMetadataSchema = z.object({
  cacheHitInputTokens: z.number().optional(),
  cacheMissInputTokens: z.number().optional(),
  cost: z.number().nonnegative().optional(),
  createdAt: z.string(),
  inputTokens: z.number().optional(),
  modelId: z.string().optional(),
  modelName: z.string().optional(),
  outputTokens: z.number().optional(),
  reasoningEffort: z
    .enum([
      "default",
      "none",
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ])
    .optional(),
  reasoningTokens: z.number().optional(),
  timeToFirstToken: z.number().optional(),
  tokensPerSecond: z.number().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type searchWebTool = InferUITool<ReturnType<typeof searchWeb>>;
type fetchUrlTool = InferUITool<typeof fetchUrl>;
type runPythonToolType = InferUITool<typeof runPythonTool>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchWeb: searchWebTool;
  fetchUrl: fetchUrlTool;
  runPython: runPythonToolType;
};

export type WaitingStatusData = {
  phase: "waiting" | "still-waiting" | "health" | "thinking";
  message: string;
  modelId: string;
  modelName: string;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
  "waiting-status": WaitingStatusData;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
