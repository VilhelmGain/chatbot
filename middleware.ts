import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import {
  isDemoMode,
  isProductionEnvironment,
  isTestEnvironment,
} from "./lib/constants";
import { isCsrfOriginAllowed } from "./lib/security/csrf";

const isProtectedRoute = createRouteMatcher([
  "/",
  "/chat/:id",
  "/settings",
  "/api/:path*",
  "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|sitemap.xml|robots.txt|privacy|terms).*)",
]);

function handlePing(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }
  return null;
}

function generateNonce(): string {
  try {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    let binary = "";
    for (const byte of array) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  if (isProductionEnvironment) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://*.clerk.com https://*.clerk.accounts.dev`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://cdn.jsdelivr.net",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function handleCsrf(request: NextRequest): Response | null {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return null;
  }
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isServerAction = request.headers.has("next-action");
  if (!isApiRoute && !isServerAction) {
    return null;
  }
  if (!isCsrfOriginAllowed(request)) {
    return new Response(
      JSON.stringify({ code: "forbidden", message: "CSRF origin mismatch" }),
      {
        headers: { "content-type": "application/json" },
        status: 403,
      }
    );
  }
  return null;
}

function handleTestRequest(request: NextRequest): NextResponse | Response {
  const ping = handlePing(request);
  if (ping) {
    const nonce = generateNonce();
    applySecurityHeaders(ping as unknown as NextResponse, nonce);
    return ping;
  }

  const csrfResponse = handleCsrf(request);
  if (csrfResponse) {
    return csrfResponse;
  }

  // Demo/test auth handling (from PR134) — mint demo session if needed
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  if (isApiRoute && isProtectedRoute(request)) {
    const hasTestCookie = request.cookies.has("test-user");
    const hasDemoCookie = request.cookies.has("demo-session");
    if (!hasTestCookie && !isDemoMode) {
      return NextResponse.json(
        {
          code: "unauthorized:chat",
          message:
            "You need to sign in to view this chat. Please sign in and try again.",
        },
        { status: 401 }
      );
    }
    if (isDemoMode && !hasTestCookie && !hasDemoCookie) {
      const demoEmail = `demo-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}@demo.local`;
      const nonce = generateNonce();
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-nonce", nonce);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.cookies.set("demo-session", demoEmail, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      applySecurityHeaders(res, nonce);
      return res;
    }
  } else if (isDemoMode && isProtectedRoute(request)) {
    const hasTestCookie = request.cookies.has("test-user");
    const hasDemoCookie = request.cookies.has("demo-session");
    if (!hasTestCookie && !hasDemoCookie) {
      const demoEmail = `demo-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}@demo.local`;
      const nonce = generateNonce();
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-nonce", nonce);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.cookies.set("demo-session", demoEmail, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      applySecurityHeaders(res, nonce);
      return res;
    }
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, nonce);
  return response;
}

const testHandler = (request: NextRequest) => handleTestRequest(request);

// In production, demo mode without ALLOW_DEMO_IN_PROD would normally use Clerk
// and crash when Clerk keys are absent (Vercel demo case). Fall back to demo
// handler when Clerk is not configured to avoid MIDDLEWARE_INVOCATION_FAILED.
const isClerkConfigured =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const useTestHandler = isTestEnvironment || (isDemoMode && !isClerkConfigured);

const clerkHandler = clerkMiddleware(async (auth, request: NextRequest) => {
  const pingResponse = handlePing(request);
  if (pingResponse) {
    const nonce = generateNonce();
    applySecurityHeaders(pingResponse as unknown as NextResponse, nonce);
    return pingResponse;
  }

  const csrfResponse = handleCsrf(request);
  if (csrfResponse) {
    return csrfResponse;
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response, nonce);
  return response;
});

function withMiddlewareErrorHandling(
  handler: (
    request: NextRequest
  ) => Promise<NextResponse | Response> | NextResponse | Response
) {
  return async (request: NextRequest) => {
    try {
      const result = await handler(request);
      return result;
    } catch (err) {
      console.error("[middleware] handler failed", err);
      if (isDemoMode) {
        try {
          return handleTestRequest(request);
        } catch {}
      }
      // Return a response instead of throwing — throwing causes Vercel's
      // MIDDLEWARE_INVOCATION_FAILED 500 page. 500 JSON keeps the edge
      // function alive and surfaces the error in logs.
      return new Response(
        JSON.stringify({ code: "internal", message: "Middleware error" }),
        { headers: { "content-type": "application/json" }, status: 500 }
      );
    }
  };
}

export default useTestHandler
  ? withMiddlewareErrorHandling(
      testHandler as unknown as (
        r: NextRequest
      ) => Promise<NextResponse | Response>
    )
  : withMiddlewareErrorHandling(
      clerkHandler as unknown as (
        r: NextRequest
      ) => Promise<NextResponse | Response>
    );

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|sitemap.xml|robots.txt).*)",
  ],
};
