import crypto from "node:crypto";
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

function signDemoEmail(email: string): string {
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

function handleTestRequest(request: NextRequest) {
  const ping = handlePing(request);
  if (ping) {
    return ping;
  }
  if (isProtectedRoute(request)) {
    const hasTestCookie = request.cookies.has("test-user");
    const hasDemoCookie = request.cookies.has("demo-session");
    if (!hasTestCookie && !isDemoMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Demo per-session mint: if demo mode without any session cookie, create one.
    if (isDemoMode && !hasTestCookie && !hasDemoCookie) {
      const demoEmail = `demo-${crypto.randomUUID()}@demo.local`;
      const signed = signDemoEmail(demoEmail);
      const res = NextResponse.next();
      res.cookies.set("demo-session", signed, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
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
