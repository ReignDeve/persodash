import "server-only";

import type { NextRequest } from "next/server";

import { ApiError, notConfigured } from "@/lib/api/errors";
import { safeEqual } from "@/lib/auth/password";
import { env } from "@/lib/env";

/** Cron endpoints require `Authorization: Bearer <CRON_SECRET>`. */
export function assertCronAuthorized(req: NextRequest) {
  const secret = env().CRON_SECRET;
  if (!secret) throw notConfigured("CRON_SECRET");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!safeEqual(token, secret)) throw new ApiError(401, "Invalid cron secret", "unauthorized");
}
