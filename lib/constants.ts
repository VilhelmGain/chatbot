export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isDemoMode = process.env.DEMO_MODE === "1";

const hasPlaywrightFlag = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

const allowDemoInProduction = process.env.ALLOW_DEMO_IN_PROD === "1";

export const isTestEnvironment =
  (isDemoMode && (!isProductionEnvironment || allowDemoInProduction)) ||
  (!isProductionEnvironment && hasPlaywrightFlag);

export function assertProductionSecurity(): void {
  if (isProductionEnvironment && isDemoMode && !allowDemoInProduction) {
    throw new Error(
      "[security] DEMO_MODE=1 is not allowed in production. Refusing to start. " +
        "Unset DEMO_MODE or set ALLOW_DEMO_IN_PROD=1 to explicitly allow demo bypass in production."
    );
  }

  if (isProductionEnvironment && hasPlaywrightFlag) {
    throw new Error(
      "[security] PLAYWRIGHT/CI_PLAYWRIGHT flags are set in production. Refusing to start. " +
        "Unset PLAYWRIGHT, PLAYWRIGHT_TEST_BASE_URL, and CI_PLAYWRIGHT in production."
    );
  }
}

export const suggestions = [
  "What are the advantages of using Next.js?",
  "Write code to demonstrate Dijkstra's algorithm",
  "Help me write an essay about Silicon Valley",
  "What is the weather in San Francisco?",
];
