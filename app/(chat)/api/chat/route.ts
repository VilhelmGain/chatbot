import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { decrypt } from "@/lib/ai/encryption";
import { getEntitlements } from "@/lib/ai/entitlements";
import {
  getCustomCapabilitiesForUser,
  isAllowedModelId,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  getCustomProviderOptionsKey,
  getLanguageModel,
  isOpenAICompatibleProvider,
} from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import {
  DOCUMENT_TOOL_IDS,
  SEARCH_PROVIDERS,
  type SearchProvider,
  TOOL_IDS,
  TOOL_IDS_SET,
} from "@/lib/ai/tools/metadata";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchWeb } from "@/lib/ai/tools/search-web";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { resolveAttachmentParts } from "@/lib/attachments";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getCustomModelsByProviderId,
  getCustomProviderById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getToolConfigByUserId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import { getClientIp, getRequestHints } from "@/lib/server/request-utils";
import type { ChatMessage, WaitingStatusData } from "@/lib/types";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

const HEALTH_CHECK_DELAY_MS = 9000;

function getStreamErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;

    if (
      e.statusCode === 401 ||
      String(e.message).toLowerCase().includes("invalid api key")
    ) {
      return "Invalid API key. Please check the provider's API key in settings.";
    }

    if (
      String(e.message).toLowerCase().includes("decrypt") ||
      String(e.cause).toLowerCase().includes("decrypt")
    ) {
      return "API key could not be decrypted. If you changed ENCRYPTION_KEY, update the provider's API key in settings.";
    }

    if (typeof e.message === "string" && e.message.length > 0) {
      return `Provider error: ${e.message}`;
    }
  }

  return "An error occurred while sending the message. Please try again.";
}

function isModelStreamActivity(chunk: { type: string }) {
  return !["start", "start-step", "finish-step", "finish", "raw"].includes(
    chunk.type
  );
}

function hasMessageContent(message: ChatMessage | UIMessage): boolean {
  return (
    getTextFromMessage(message).length > 0 ||
    message.parts.some(
      (part) =>
        part.type === "reasoning" ||
        part.type === "tool-invocation" ||
        part.type === "file"
    )
  );
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatbotError(
        "bad_request:api",
        error.issues.map((i) => i.message).join(", ")
      ).toResponse();
    }
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      reasoningEffort,
      selectedChatModel,
      selectedVisibilityType,
      enabledTools,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const isAllowed = await isAllowedModelId(selectedChatModel);
    if (!isAllowed) {
      console.error("Model not allowed:", selectedChatModel);
      return new ChatbotError("bad_request:chat").toResponse();
    }

    const chatModel = selectedChatModel;
    const providerId = chatModel.split("/")[0].slice(7);
    const provider = await getCustomProviderById({ id: providerId });
    if (!provider || provider.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
    const selectedModelName =
      (await getCustomModelsByProviderId({ providerId })).find(
        (model) => model.modelId === chatModel.split("/").slice(1).join("/")
      )?.name ?? chatModel;

    await checkIpRateLimit(getClientIp(request));

    const messageCount = await getMessageCountByUserId({
      differenceInHours: 1,
      id: session.user.id,
    });

    const entitlements = getEntitlements();
    if (
      entitlements.maxMessagesPerHour > 0 &&
      messageCount > entitlements.maxMessagesPerHour
    ) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        title: "New chat",
        userId: session.user.id,
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({
        chatModelId: chatModel,
        message,
        reasoningEffort,
        userId: session.user.id,
      });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = getRequestHints(request);

    const requestHints: RequestHints = {
      city,
      country,
      latitude,
      longitude,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            attachments: [],
            chatId: id,
            createdAt: new Date(),
            id: message.id,
            metadata: {},
            parts: message.parts,
            role: "user",
          },
        ],
      });
    }

    const modelCapabilities = await getCustomCapabilitiesForUser(
      session.user.id
    );
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const enabledToolSet = new Set(
      (enabledTools ?? [...TOOL_IDS]).filter((toolId) =>
        TOOL_IDS_SET.has(toolId)
      )
    );

    const approvalToolNames = new Set<string>();
    if (isToolApprovalFlow && messages) {
      for (const m of messages) {
        for (const p of m.parts ?? []) {
          if (typeof p.toolName === "string") {
            approvalToolNames.add(p.toolName);
          }
        }
      }
    }

    const effectiveToolNames = new Set([
      ...enabledToolSet,
      ...approvalToolNames,
    ]);

    let searchWebConfig:
      | { apiKey: string; baseURL?: string; provider: SearchProvider }
      | undefined;
    if (supportsTools && effectiveToolNames.has("searchWeb")) {
      // Providers are checked in SEARCH_PROVIDERS order; the first enabled
      // config wins (Tavily takes precedence when both are enabled).
      const searchConfigs = await Promise.all(
        SEARCH_PROVIDERS.map(async (searchProvider) => ({
          provider: searchProvider,
          toolConfig: await getToolConfigByUserId({
            provider: searchProvider,
            toolId: "searchWeb",
            userId: session.user.id,
          }),
        }))
      );
      const enabledSearchConfig = searchConfigs.find(
        ({ toolConfig }) => toolConfig?.enabled === true
      );
      if (enabledSearchConfig) {
        const { provider: configProvider, toolConfig } = enabledSearchConfig;
        searchWebConfig = {
          apiKey: toolConfig?.encryptedApiKey
            ? decrypt(toolConfig.encryptedApiKey, toolConfig.iv)
            : "",
          baseURL: toolConfig?.baseURL || undefined,
          provider: configProvider,
        };
      }
    }

    const hasDocumentTools = DOCUMENT_TOOL_IDS.some((toolId) =>
      effectiveToolNames.has(toolId)
    );
    const responseStartedAt = new Date();
    const baseMessageMetadata = {
      createdAt: responseStartedAt.toISOString(),
      modelId: chatModel,
      modelName: selectedModelName,
      reasoningEffort: isReasoningModel ? reasoningEffort : undefined,
    };

    const modelMessages = await convertToModelMessages(
      await resolveAttachmentParts(uiMessages)
    );

    let lastStreamError: unknown = null;

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        lastStreamError = null;
        let hasModelActivity = false;
        let healthCheckTimer: ReturnType<typeof setTimeout> | undefined;
        let outputTokens = 0;
        let tokensPerSecond: number | undefined;
        let timeToFirstToken: number | undefined;

        const clearHealthCheckTimer = () => {
          if (healthCheckTimer) {
            clearTimeout(healthCheckTimer);
          }
        };

        const writeWaitingStatus = (
          phase: WaitingStatusData["phase"],
          messageText: string
        ) => {
          if (hasModelActivity && phase !== "thinking") {
            return;
          }
          dataStream.write({
            data: {
              message: messageText,
              modelId: chatModel,
              modelName: selectedModelName,
              phase,
            },
            transient: true,
            type: "data-waiting-status",
          });
        };

        writeWaitingStatus("waiting", "Waiting...");

        healthCheckTimer = setTimeout(() => {
          writeWaitingStatus("still-waiting", "Still waiting...");
        }, HEALTH_CHECK_DELAY_MS);

        const markModelActive = () => {
          if (hasModelActivity) {
            return;
          }
          hasModelActivity = true;
          clearHealthCheckTimer();
          writeWaitingStatus("thinking", "Thinking...");
        };

        const stopWaitingStatus = () => {
          hasModelActivity = true;
          clearHealthCheckTimer();
        };

        const providerOptionsKey = getCustomProviderOptionsKey(provider);
        const isOpenAICompatible = isOpenAICompatibleProvider(provider);

        // The unified `reasoning` option supports a fixed set of values.
        // Provider-specific values like "max" must be sent through
        // `providerOptions` instead.
        const reasoningValue =
          isReasoningModel &&
          reasoningEffort &&
          reasoningEffort !== "default" &&
          reasoningEffort !== "max"
            ? reasoningEffort
            : undefined;

        const providerOptions =
          isReasoningModel &&
          reasoningEffort &&
          reasoningEffort !== "default" &&
          isOpenAICompatible
            ? {
                [providerOptionsKey]: {
                  reasoningEffort,
                },
              }
            : undefined;

        const result = streamText({
          abortSignal: request.signal,
          activeTools: supportsTools
            ? TOOL_IDS.filter(
                (toolId) =>
                  effectiveToolNames.has(toolId) &&
                  (toolId !== "searchWeb" || searchWebConfig !== undefined)
              )
            : [],
          instructions: systemPrompt({
            requestHints,
            supportsTools: supportsTools && hasDocumentTools,
          }),
          messages: modelMessages,
          model: await getLanguageModel(chatModel),
          onAbort() {
            stopWaitingStatus();
          },
          onChunk({ chunk }) {
            if (isModelStreamActivity(chunk)) {
              markModelActive();
            }
          },
          onEnd() {
            stopWaitingStatus();
          },
          onError({ error }: { error: unknown }) {
            console.error("streamText error:", error);
            lastStreamError = error;
            stopWaitingStatus();
          },
          providerOptions,
          reasoning: reasoningValue,
          stopWhen: isStepCount(5),
          telemetry: {
            functionId: "stream-text",
            isEnabled: isProductionEnvironment,
          },
          tools: {
            ...(effectiveToolNames.has("getWeather") ? { getWeather } : {}),
            ...(effectiveToolNames.has("createDocument")
              ? {
                  createDocument: createDocument({
                    dataStream,
                    modelId: chatModel,
                    session,
                  }),
                }
              : {}),
            ...(effectiveToolNames.has("editDocument")
              ? { editDocument: editDocument({ dataStream, session }) }
              : {}),
            ...(effectiveToolNames.has("updateDocument")
              ? {
                  updateDocument: updateDocument({
                    dataStream,
                    modelId: chatModel,
                    session,
                  }),
                }
              : {}),
            ...(effectiveToolNames.has("requestSuggestions")
              ? {
                  requestSuggestions: requestSuggestions({
                    dataStream,
                    modelId: chatModel,
                    session,
                  }),
                }
              : {}),
            ...(searchWebConfig === undefined
              ? {}
              : {
                  searchWeb: searchWeb({
                    apiKey: searchWebConfig.apiKey,
                    baseURL: searchWebConfig.baseURL,
                    provider: searchWebConfig.provider,
                  }),
                }),
          },
        });

        dataStream.merge(
          toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type === "start") {
                return baseMessageMetadata;
              }
              if (part.type === "finish-step") {
                outputTokens += part.usage.outputTokens ?? 0;
                tokensPerSecond =
                  part.performance.outputTokensPerSecond ??
                  part.performance.effectiveOutputTokensPerSecond;
                timeToFirstToken ??= part.performance.timeToFirstOutputMs;

                return {
                  ...baseMessageMetadata,
                  outputTokens,
                  timeToFirstToken,
                  tokensPerSecond,
                };
              }
              if (part.type === "finish") {
                return {
                  ...baseMessageMetadata,
                  outputTokens: part.totalUsage.outputTokens ?? outputTokens,
                  timeToFirstToken,
                  tokensPerSecond,
                };
              }
            },
            sendReasoning: isReasoningModel,
            stream: result.stream,
          })
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: "data-chat-title" });
            updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onEnd: async ({
        isAborted,
        messages: finishedMessages,
        responseMessage,
      }) => {
        if (isAborted) {
          const abortedMessage = responseMessage ?? finishedMessages.at(-1);
          if (!abortedMessage || !hasMessageContent(abortedMessage)) {
            return;
          }
        }
        if (isToolApprovalFlow) {
          await Promise.all(
            finishedMessages.map(async (finishedMsg) => {
              const existingMsg = uiMessages.find(
                (m) => m.id === finishedMsg.id
              );
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  metadata: finishedMsg.metadata,
                  parts: finishedMsg.parts,
                });
                return;
              }

              await saveMessages({
                messages: [
                  {
                    attachments: [],
                    chatId: id,
                    createdAt: new Date(),
                    id: finishedMsg.id,
                    metadata: finishedMsg.metadata ?? {},
                    parts: finishedMsg.parts,
                    role: finishedMsg.role,
                  },
                ],
              });
            })
          );
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: currentMessage.id,
              metadata: currentMessage.metadata ?? {},
              parts: currentMessage.parts,
              role: currentMessage.role,
            })),
          });
        }
      },
      onError: (error: unknown) => {
        console.error("createUIMessageStream error:", error);
        return getStreamErrorMessage(lastStreamError ?? error);
      },
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    });

    return createUIMessageStreamResponse({
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateUUID();
            await createStreamId({ chatId: id, streamId });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch {
          /* non-critical */
        }
      },
      stream,
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
