export const TOOL_IDS = [
  "getWeather",
  "createDocument",
  "editDocument",
  "updateDocument",
  "requestSuggestions",
  "searchWeb",
  "fetchUrl",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const TOOL_IDS_SET: ReadonlySet<string> = new Set(TOOL_IDS);

export const DOCUMENT_TOOL_IDS = [
  "createDocument",
  "editDocument",
  "updateDocument",
  "requestSuggestions",
] as const;

export type ToolMetadata = { label: string; description: string };

export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  createDocument: {
    description: "Create scripts, documents, and spreadsheets.",
    label: "Create document",
  },
  editDocument: {
    description: "Make targeted edits to an existing artifact.",
    label: "Edit document",
  },
  fetchUrl: {
    description: "Read the content of a web page from its URL.",
    label: "Fetch URL",
  },
  getWeather: {
    description: "Get current weather at a location.",
    label: "Weather",
  },
  requestSuggestions: {
    description: "Get writing suggestions for a document.",
    label: "Request suggestions",
  },
  searchWeb: {
    description: "Search the web for up-to-date information.",
    label: "Web search",
  },
  updateDocument: {
    description: "Rewrite an entire artifact.",
    label: "Update document",
  },
};

export const CONFIGURABLE_TOOLS = ["searchWeb"] as const;

export type ConfigurableToolId = (typeof CONFIGURABLE_TOOLS)[number];

export const SEARCH_PROVIDERS = ["tavily", "searxng"] as const;

export type SearchProvider = (typeof SEARCH_PROVIDERS)[number];
