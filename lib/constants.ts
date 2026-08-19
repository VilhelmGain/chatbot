export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isDemoMode = process.env.DEMO_MODE === "1";

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT ||
    isDemoMode
);

export const suggestions = [
  "What are the advantages of using Next.js?",
  "Write code to demonstrate Dijkstra's algorithm",
  "Help me write an essay about Silicon Valley",
  "What is the weather in San Francisco?",
];
