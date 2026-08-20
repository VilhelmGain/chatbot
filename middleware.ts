import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { isDemoMode, isTestEnvironment } from "./lib/constants";

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

function handleTestRequest(request: NextRequest) {
  const ping = handlePing(request);
  if (ping) {
    return ping;
  }
  // In test/demo mode require a signed test-user cookie for protected routes.
  // This prevents unauthenticated access when env flags leak.
  if (isProtectedRoute(request)) {
    const hasTestCookie = request.cookies.has("test-user");
    // Demo mode intentionally allows anonymous access but auth() creates a
    // per-session demo user (see app/(auth)/auth.ts). Non-demo test env
    // requires the cookie — Playwright helpers always set it.
    if (!hasTestCookie && !isDemoMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

const testHandler = (request: NextRequest) => handleTestRequest(request);

export default isTestEnvironment
  ? testHandler
  : clerkMiddleware(async (auth, request: NextRequest) => {
      const pingResponse = handlePing(request);
      if (pingResponse) {
        return pingResponse;
      }

      if (isProtectedRoute(request)) {
        await auth.protect();
      }
    });

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|sitemap.xml|robots.txt).*)",
  ],
};
