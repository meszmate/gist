import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["en", "hu"];
const DEFAULT_LOCALE = "en";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/library",
    "/create",
    "/study",
    "/contacts",
    "/settings",
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
  ],
};
