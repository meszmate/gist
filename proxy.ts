import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const SUPPORTED_LOCALES = ["en", "hu"];
const DEFAULT_LOCALE = "en";

const AI_ROUTE_PATTERNS = [
  /^\/api\/resources\/[^/]+\/generate/,
  /^\/api\/resources\/[^/]+\/lessons\/generate/,
  /^\/api\/resources\/[^/]+\/lessons\/[^/]+\/steps\/[^/]+\/improve/,
  /^\/api\/chat\//,
];

function isAiRoute(pathname: string): boolean {
  return AI_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function getClientIp(request: Request & { headers: Headers }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Rate limit API routes (except auth)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    const ip = getClientIp(req);
    const config = isAiRoute(pathname) ? RATE_LIMITS.ai : RATE_LIMITS.api;
    const key = `${ip}:${isAiRoute(pathname) ? "ai" : "api"}`;

    const result = rateLimit(key, config);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    return response;
  }

  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/library",
    "/create",
    "/study",
    "/contacts",
    "/settings",
    "/courses",
    "/progress",
  ];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Redirect logged-in users from login page to dashboard
  if (pathname === "/login" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  // Set locale cookie for first-time visitors based on Accept-Language
  const localeCookie = req.cookies.get("locale")?.value;
  if (!localeCookie) {
    const acceptLang = req.headers.get("accept-language") || "";
    const preferred = acceptLang
      .split(",")
      .map((part) => part.split(";")[0].trim().split("-")[0])
      .find((lang) => SUPPORTED_LOCALES.includes(lang));
    const locale = preferred || DEFAULT_LOCALE;

    const response = NextResponse.next();
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return response;
  }
});

export const config = {
  matcher: [
    // Match all paths except static files and API routes (except auth)
    "/((?!_next/static|_next/image|favicon.ico|api/(?!auth)).*)",
    // Also match API routes for rate limiting
    "/api/:path*",
  ],
};
