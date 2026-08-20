import { createClient } from "redis";

import { isTestEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const TTL_SECONDS = 60 * 60;

// Per-endpoint limits (requests per TTL window)
export const RATE_LIMITS = {
  chat: { limit: 500, windowSeconds: TTL_SECONDS },
  detect: { limit: 20, windowSeconds: TTL_SECONDS },
  export: { limit: 20, windowSeconds: TTL_SECONDS },
  providerTest: { limit: 20, windowSeconds: TTL_SECONDS },
  upload: { limit: 30, windowSeconds: TTL_SECONDS },
} as const;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => {
      console.warn("Redis rate-limit client error:", err);
    });
    client.connect().catch((err) => {
      console.warn("Redis rate-limit connection failed:", err);
      client = null;
    });
  }
  return client;
}

/**
 * Generic sliding-window rate limiter backed by Redis.
 * Uses INCR + EXPIRE (without NX) so TTL is refreshed on every hit.
 * Fail-open with a warning when Redis is unavailable, but never silently.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  if (isTestEnvironment) {
    return;
  }

  const redis = getClient();

  if (!redis?.isReady) {
    if (process.env.REDIS_URL) {
      console.warn(
        `Rate limit check for "${key}" skipped: Redis not ready (fail-open with warning)`
      );
    } else {
      console.warn(
        `Rate limit check for "${key}" skipped: REDIS_URL not configured (no IP rate limiting)`
      );
    }
    return;
  }

  try {
    const results = await redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec();

    // results is an array of replies; first element is the INCR count
    const count = results?.[0] as unknown as number | undefined;

    if (typeof count === "number" && count > limit) {
      throw new ChatbotError("rate_limit:chat");
    }
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    console.warn(`Rate limit check for "${key}" failed (fail-open):`, error);
  }
}

export async function checkIpRateLimit(
  ip: string | undefined,
  opts?: { userId?: string }
) {
  if (isTestEnvironment) {
    return;
  }

  // Build a key that is robust against IP spoofing: when we have a trusted
  // IP use it, otherwise fall back to userId. When both are present prefer a
  // combined key so an attacker cannot bypass the limit by spoofing x-forwarded-for.
  let key: string | undefined;
  if (ip && opts?.userId) {
    key = `ip-rate-limit:${ip}:user:${opts.userId}`;
  } else if (ip) {
    key = `ip-rate-limit:${ip}`;
  } else if (opts?.userId) {
    key = `ip-rate-limit:user:${opts.userId}`;
  }

  if (!key) {
    console.warn(
      "Rate limit check skipped: no IP or userId available (fail-open with warning)"
    );
    return;
  }

  const { limit, windowSeconds } = RATE_LIMITS.chat;
  await rateLimit(key, limit, windowSeconds);
}

export async function checkUploadRateLimit(
  ip: string | undefined,
  userId: string
) {
  const key = ip
    ? `upload-rate-limit:${ip}:user:${userId}`
    : `upload-rate-limit:user:${userId}`;
  const { limit, windowSeconds } = RATE_LIMITS.upload;
  await rateLimit(key, limit, windowSeconds);
}

export async function checkExportRateLimit(
  ip: string | undefined,
  userId: string
) {
  const key = ip
    ? `export-rate-limit:${ip}:user:${userId}`
    : `export-rate-limit:user:${userId}`;
  const { limit, windowSeconds } = RATE_LIMITS.export;
  await rateLimit(key, limit, windowSeconds);
}

export async function checkProviderTestRateLimit(
  ip: string | undefined,
  userId: string
) {
  const key = ip
    ? `provider-test-rate-limit:${ip}:user:${userId}`
    : `provider-test-rate-limit:user:${userId}`;
  const { limit, windowSeconds } = RATE_LIMITS.providerTest;
  await rateLimit(key, limit, windowSeconds);
}

export async function checkDetectRateLimit(
  ip: string | undefined,
  userId: string
) {
  const key = ip
    ? `detect-rate-limit:${ip}:user:${userId}`
    : `detect-rate-limit:user:${userId}`;
  const { limit, windowSeconds } = RATE_LIMITS.detect;
  await rateLimit(key, limit, windowSeconds);
}
