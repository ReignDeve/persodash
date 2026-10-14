import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { badRequest, tooManyRequests, unauthorized } from "@/lib/api/errors";
import { hashPassword, safeEqual, verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { clientInfo, createSession, type CurrentUser } from "@/lib/auth/session";
import type { LoginValues, SessionInfo } from "@/lib/schemas/settings";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Verified against when the user does not exist, so response time does not
// reveal whether a username is valid.
const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

/**
 * Bootstrap: with an empty users table, the first login matching
 * DASHBOARD_USERNAME / DASHBOARD_PASSWORD creates the account (hashed).
 * Keeps existing deployments working after the upgrade.
 */
async function bootstrapUser(username: string, password: string) {
  const { DASHBOARD_USERNAME, DASHBOARD_PASSWORD } = env();
  if (!DASHBOARD_USERNAME || !DASHBOARD_PASSWORD) return null;
  if ((await db.user.count()) > 0) return null;
  if (!safeEqual(username, DASHBOARD_USERNAME) || !safeEqual(password, DASHBOARD_PASSWORD)) return null;

  console.info(`[auth] bootstrapped user "${username}" from environment`);
  return db.user.create({ data: { username, passwordHash: await hashPassword(password) } });
}

export async function login({ username, password }: LoginValues) {
  const { ip } = await clientInfo();
  const limitKey = `login:${ip ?? "unknown"}`;
  const limit = rateLimit(limitKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.ok) throw tooManyRequests(limit.retryAfterSeconds);

  const user = await db.user.findUnique({ where: { username } });
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, DUMMY_HASH), false);

  const account = valid ? user : await bootstrapUser(username, password);
  if (!account) throw unauthorized("Invalid username or password");

  resetRateLimit(limitKey);
  await createSession(account.id);
  return { username: account.username };
}

export async function changePassword(user: CurrentUser, current: string, next: string) {
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) {
    throw badRequest("Current password is incorrect");
  }
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    // Sign out everywhere else.
    db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId } } }),
  ]);
}

export async function listSessions(user: CurrentUser): Promise<SessionInfo[]> {
  const sessions = await db.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
  return sessions.map((s) => ({
    id: s.id,
    current: s.id === user.sessionId,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
  }));
}

export async function revokeSession(user: CurrentUser, sessionId: string) {
  if (sessionId === user.sessionId) throw badRequest("Use “Sign out” to end the current session");
  await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
}

export async function revokeOtherSessions(user: CurrentUser) {
  const { count } = await db.session.deleteMany({
    where: { userId: user.id, id: { not: user.sessionId } },
  });
  return { revoked: count };
}

export async function purgeExpiredSessions() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
