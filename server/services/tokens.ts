import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import type { TokenInput, TokenItem, TokenScope } from "@/lib/schemas/automation";

const TOKEN_PREFIX = "pd_";
const PREFIX_SHOWN = 10;
const TOUCH_INTERVAL_MS = 60_000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function toItem(t: { id: string; name: string; prefix: string; scopes: string[]; lastUsedAt: Date | null; createdAt: Date }): TokenItem {
  return {
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scopes: t.scopes as TokenScope[],
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function listTokens(): Promise<TokenItem[]> {
  const tokens = await db.apiToken.findMany({ where: { revokedAt: null }, orderBy: { createdAt: "desc" } });
  return tokens.map(toItem);
}

/** Returns the plain token exactly once – only its hash is stored. */
export async function createToken(input: TokenInput) {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const record = await db.apiToken.create({
    data: {
      name: input.name,
      scopes: input.scopes,
      tokenHash: hashToken(token),
      prefix: token.slice(0, PREFIX_SHOWN),
    },
  });
  return { token, item: toItem(record) };
}

export async function revokeToken(id: string) {
  await db.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
}

/** Resolves a bearer token to its record; null if unknown or revoked. */
export async function verifyToken(token: string) {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const record = await db.apiToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.revokedAt) return null;

  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return { id: record.id, name: record.name, scopes: record.scopes as TokenScope[] };
}
