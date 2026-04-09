import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const AI_ROUTE_PATTERNS = [
  /^\/api\/resources\/[^/]+\/generate/,
  /^\/api\/resources\/[^/]+\/lessons\/generate/,
  /^\/api\/resources\/[^/]+\/lessons\/[^/]+\/steps\/[^/]+\/improve/,
  /^\/api\/chat\//,
];

function isAiRoute(pathname: string): boolean {
  return AI_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip auth callback routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
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

export const config = {
  matcher: ["/api/:path*"],
};
