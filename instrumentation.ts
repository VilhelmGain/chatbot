// Telemetry disabled for self-hosted deployment
export async function register() {
  // Security: refuse to start with DEMO_MODE in production unless explicitly allowed
  const { assertProductionSecurity } = await import("./lib/constants");
  assertProductionSecurity();
}
