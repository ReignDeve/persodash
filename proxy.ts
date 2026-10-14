import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * First line of defence, runs before every request:
 * 1. CSRF: state-changing API requests must come from this origin.
 * 2. Cheap session gate: no cookie → login redirect / 401.
 *
 * The cookie is only *validated* (against the DB) in the dashboard layout and
 * in every API handler (`authed`), so a forged cookie gets nowhere.
 */

const PUBLIC_PATHS = [
  "/login",
  "/offline",
  "/api/auth/login",
  "/api/health",
  "/api/cron/", // protected by CRON_SECRET instead
  "/api/automation/", // protected by API tokens instead
  "/manifest.webmanifest",
  "/sw.js",
  "/icon",
  "/apple-icon",
  "/favicon.ico",
];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Browsers always send Origin on cross-site POST/PATCH/DELETE; fetches
    // without it come from non-browser clients which have no cookie to ride on.
    return req.headers.get("sec-fetch-site") !== "cross-site";
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi && !SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return NextResponse.json(
      { error: { message: "Cross-origin request rejected", code: "csrf" } },
      { status: 403 },
    );
  }

  if (isPublic(pathname)) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    if (isApi) {
      return NextResponse.json(
        { error: { message: "Not signed in", code: "unauthorized" } },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
