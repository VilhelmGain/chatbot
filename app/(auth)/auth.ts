import crypto from "node:crypto";
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { isDemoMode, isTestEnvironment } from "@/lib/constants";
import {
  createUserFromClerk,
  getOrCreateUserByEmail,
  getUserByClerkId,
} from "@/lib/db/queries";

const emailSchema = z.string().email();

// Simple in-memory rate limiter for test-user creation (fail-closed is not
// needed here because this path is only active in non-production).
const TEST_USER_RATE_WINDOW_MS = 60_000;
const TEST_USER_RATE_LIMIT = 30;
const testUserHits = new Map<string, { count: number; resetAt: number }>();

function checkTestUserRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = testUserHits.get(key);
  if (!entry || entry.resetAt <= now) {
    testUserHits.set(key, {
      count: 1,
      resetAt: now + TEST_USER_RATE_WINDOW_MS,
    });
    return true;
  }
  if (entry.count >= TEST_USER_RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
}

function verifySignedTestUserCookie(raw: string): string | null {
  // Format: email|hmac — legacy plain email is accepted in test env for
  // backward compat with existing Playwright helpers (they set raw email).
  const parsedEmail = emailSchema.safeParse(raw);
  if (parsedEmail.success) {
    // Plain email — allow but log. Signed variant is preferred.
    return parsedEmail.data;
  }
  const sepIdx = raw.lastIndexOf("|");
  if (sepIdx === -1) {
    return null;
  }
  const email = raw.slice(0, sepIdx);
  const sig = raw.slice(sepIdx + 1);
  const emailValid = emailSchema.safeParse(email);
  if (!emailValid.success) {
    return null;
  }
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(email, "utf8")
    .digest("hex");
  // timingSafeEqual
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(a, b)) {
      return null;
    }
  } catch {
    return null;
  }
  return email;
}

export function signTestUserCookie(email: string): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    return email;
  }
  const sig = crypto
    .createHmac("sha256", secret)
    .update(email, "utf8")
    .digest("hex");
  return `${email}|${sig}`;
}

export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string | null;
};

export type Session = {
  user: User;
};

export async function auth(): Promise<Session | null> {
  if (isTestEnvironment) {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("test-user")?.value;

    let email: string | undefined;
    if (rawCookie !== undefined) {
      const verified = verifySignedTestUserCookie(rawCookie);
      if (!verified) {
        return null;
      }
      email = verified;
      if (!checkTestUserRateLimit(`test-user:${email}`)) {
        return null;
      }
    } else if (isDemoMode) {
      // Per-session demo user: use a dedicated cookie so each browser gets
      // an isolated demo identity instead of sharing demo@example.com.
      const demoCookie = cookieStore.get("demo-session")?.value;
      let demoEmail: string | undefined;
      if (demoCookie) {
        const v = verifySignedTestUserCookie(demoCookie);
        if (v) {
          demoEmail = v;
        }
      }
      if (!demoEmail) {
        demoEmail = `demo-${crypto.randomUUID()}@demo.local`;
        // Best-effort set cookie — ignore errors in edge/test contexts.
        try {
          const signed = signTestUserCookie(demoEmail);
          cookieStore.set("demo-session", signed, {
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        } catch {
          // ignore
        }
      }
      email = demoEmail;
      if (!checkTestUserRateLimit(`demo:${email}`)) {
        return null;
      }
    }

    if (!email) {
      return null;
    }

    const dbUser = await getOrCreateUserByEmail(email);
    return { user: dbUser };
  }

  const { userId } = await clerkAuth();
  if (!userId) {
    return null;
  }

  let dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;
    const email = primaryEmail ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email || !emailSchema.safeParse(email).success) {
      return null;
    }

    dbUser = await createUserFromClerk({
      clerkId: userId,
      email,
      emailVerified: clerkUser?.emailAddresses.some(
        (address) => address.verification?.status === "verified"
      ),
      image: clerkUser?.imageUrl ?? null,
      name: clerkUser?.fullName ?? null,
    });
  }

  return { user: dbUser };
}
