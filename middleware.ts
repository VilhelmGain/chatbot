import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { isProductionEnvironment, isTestEnvironment } from "./lib/constants";
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
  // Use Web Crypto if available, fallback to randomUUID
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
  // CSP with nonce for inline scripts (theme + font). Keep report-only compatible.
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

const testHandler = (request: NextRequest) => {
  const pingResponse = handlePing(request);
  if (pingResponse) {
    applySecurityHeaders(
      pingResponse as unknown as NextResponse,
      generateNonce()
    );
    return pingResponse;
  }
  const csrfResponse = handleCsrf(request);
  if (csrfResponse) {
    return csrfResponse;
  }
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response, nonce);
  return response;
};

export default isTestEnvironment
  ? testHandler
  : clerkMiddleware(async (auth, request: NextRequest) => {
      const pingResponse = handlePing(request);
      if (pingResponse) {
        applySecurityHeaders(
          pingResponse as unknown as NextResponse,
          generateNonce()
        );
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|sitemap.xml|robots.txt).*)",
  ],
};
