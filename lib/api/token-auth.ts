import "server-only";

import type { NextRequest } from "next/server";

import { ApiError, tooManyRequests } from "@/lib/api/errors";
import { open } from "@/lib/api/handler";
import { rateLimit } from "@/lib/auth/rate-limit";
import type { TokenScope } from "@/lib/schemas/automation";
import { verifyToken } from "@/server/services/tokens";

const REQUESTS_PER_MINUTE = 60;

export type TokenContext = { id: string; name: string; scopes: TokenScope[] };

/**
 * Route handler for the automation API: `Authorization: Bearer pd_…` with the
 * required scope. Browsers never send bearer tokens on their own, so these
 * endpoints are not exposed to CSRF.
 */
export function withToken(scope: TokenScope, handler: (req: NextRequest, token: TokenContext) => Promise<unknown>) {
  return open(async (req) => {
    const header = req.headers.get("authorization") ?? "";
    const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const token = raw ? await verifyToken(raw) : null;
    if (!token) throw new ApiError(401, "Missing or invalid API token", "unauthorized");
    if (!token.scopes.includes(scope)) {
      throw new ApiError(403, `This token is missing the “${scope}” permission`, "forbidden");
    }

    const limit = rateLimit(`token:${token.id}`, REQUESTS_PER_MINUTE, 60_000);
    if (!limit.ok) throw tooManyRequests(limit.retryAfterSeconds);

    return handler(req, token);
  });
}
