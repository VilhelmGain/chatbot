import { z } from "zod";

const envSchema = z.object({
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required")
    .refine(
      (val) => Buffer.byteLength(val, "utf8") >= 32,
      "ENCRYPTION_KEY must be at least 32 bytes — generate with: openssl rand -base64 32"
    ),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  POSTGRES_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  UPLOAD_DIR: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

function isDemoActive(): boolean {
  return process.env.DEMO_MODE === "1";
}

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // In production, fail fast for weak/missing ENCRYPTION_KEY; otherwise warn
    const isProd = process.env.NODE_ENV === "production";
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Demo mode (and PLAYWRIGHT in non-prod) runs with no ENCRYPTION_KEY/DB.
    // Don't fail fast when DEMO_MODE is active — let assertProductionSecurity handle prod demo gating.
    if (isProd && !isDemoActive()) {
      throw new Error(`[env] Invalid environment: ${issues}`);
    }
    // In dev/test, or demo in prod, allow missing ENCRYPTION_KEY / POSTGRES_URL
    console.warn(`[env] Environment validation warning: ${issues}`);
    return {
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      POSTGRES_URL: process.env.POSTGRES_URL,
      REDIS_URL: process.env.REDIS_URL,
      UPLOAD_DIR: process.env.UPLOAD_DIR,
    };
  }

  const env = parsed.data;

  if (
    process.env.NODE_ENV === "production" &&
    !isDemoActive() &&
    env.NEXT_PUBLIC_APP_URL &&
    !env.NEXT_PUBLIC_APP_URL.startsWith("https://")
  ) {
    throw new Error(
      "[env] NEXT_PUBLIC_APP_URL must use https:// in production"
    );
  }

  return env;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = parseEnv();
  }
  return cachedEnv;
}

// Eager validation in production to fail fast on startup (import side-effect)
// Skip when DEMO_MODE is active — demo runs without ENCRYPTION_KEY/POSTGRES_URL.
if (process.env.NODE_ENV === "production" && !isDemoActive()) {
  getEnv();
}

export const env = new Proxy({} as Env, {
  get(_target, prop) {
    const e = getEnv();
    return (e as unknown as Record<string, unknown>)[prop as string];
  },
});
