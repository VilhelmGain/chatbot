import "server-only";

import { isTestEnvironment } from "@/lib/constants";
import { inMemoryQueries } from "./in-memory";
// biome-ignore lint/performance/noNamespaceImport: dispatcher needs the full namespace to pick an impl at runtime
import * as pgQueries from "./queries.pg";

type Queries = typeof import("./queries.pg");

type Relaxed<T> = T extends (...args: infer A) => unknown
  ? (...args: A) => unknown
  : never;

const memQueries = inMemoryQueries satisfies {
  [K in keyof Queries]: Relaxed<Queries[K]>;
};

const impl: Queries = isTestEnvironment
  ? (memQueries as unknown as Queries)
  : pgQueries;

export const {
  createCustomModel,
  createCustomModels,
  createCustomProvider,
  createStreamId,
  createUserFromClerk,
  deleteAllChatsByUserId,
  deleteChatById,
  deleteCustomModel,
  deleteCustomProvider,
  deleteDocumentsByIdAfterTimestamp,
  deleteMessagesByChatIdAfterTimestamp,
  getAllChatsByUserId,
  getAllMessagesByUserId,
  getChatById,
  getChatsByUserId,
  getCustomModelsByProviderId,
  getCustomModelsForUser,
  getCustomProviderById,
  getCustomProviderByModelId,
  getCustomProvidersByUserId,
  getDecryptedApiKey,
  getDocumentById,
  getDocumentsById,
  getMessageById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getOrCreateUserByEmail,
  getStreamIdsByChatId,
  getSuggestionsByDocumentId,
  getUserByClerkId,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
  updateChatTitleById,
  updateChatVisibilityById,
  updateCustomModel,
  updateCustomProvider,
  updateDocumentContent,
  updateMessage,
} = impl;
