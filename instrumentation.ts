// Telemetry disabled for self-hosted deployment
export async function register() {
  // Validate env early so weak ENCRYPTION_KEY fails fast in production
  const { getEnv } = await import("./lib/env");
  getEnv();
  const { assertProductionSecurity } = await import("./lib/constants");
  assertProductionSecurity();
}
