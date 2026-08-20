// Telemetry disabled for self-hosted deployment
export function register() {
  // Security: refuse to start with DEMO_MODE in production unless explicitly allowed
  const { assertProductionSecurity } = require("./lib/constants");
  assertProductionSecurity();
}
