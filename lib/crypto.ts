import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { ApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";

// AES-256-GCM for small secrets stored in the database (e.g. API keys in
// action headers). The key lives only in the environment, so a database dump
// alone does not reveal them.

const PREFIX = "enc:v1:";

function key() {
  const raw = env().SECRETS_KEY;
  if (!raw) {
    throw new ApiError(503, "Set SECRETS_KEY to store secret values (openssl rand -hex 32).", "not_configured");
  }
  // Accept any string; derive a fixed-length key.
  return createHash("sha256").update(raw).digest();
}

export function isSecretsConfigured() {
  return Boolean(env().SECRETS_KEY);
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptSecret(stored: string) {
  if (!stored.startsWith(PREFIX)) return stored;
  const [iv, tag, data] = stored.slice(PREFIX.length).split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
