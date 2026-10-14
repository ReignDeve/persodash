import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { isProduction } from "@/lib/env";
import {
  SESSION_COOKIE,
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_DAYS,
} from "@/lib/auth/constants";

const TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type CurrentUser = { id: string; username: string; sessionId: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function clientInfo() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await clientInfo();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, ip, userAgent, expiresAt },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolves the signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, username: true } } },
  });

  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Sliding expiry, throttled to keep reads read-only most of the time.
  if (now - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now), expiresAt: new Date(now + TTL_MS) },
      })
      .catch(() => undefined);
  }

  return { id: session.user.id, username: session.user.username, sessionId: session.id };
});

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}
