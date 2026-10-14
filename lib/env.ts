import "server-only";

import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CRON_SECRET: optional,
  /** Encrypts secret values stored in the DB (action headers). */
  SECRETS_KEY: optional,
  // On by default in production only, so a local dev server never sends
  // duplicate alerts or summaries next to the VPS instance.
  SCHEDULER_ENABLED: optional.transform((v) =>
    v === undefined ? process.env.NODE_ENV === "production" : v === "true",
  ),

  DASHBOARD_USERNAME: optional,
  DASHBOARD_PASSWORD: optional,

  BTC_ADDRESS: optional,
  WORKER: optional,

  VERCEL_API_TOKEN: optional,
  VERCEL_TEAM_ID: optional,

  COINBASE_API_KEY_ID: optional,
  COINBASE_API_KEY_SECRET: optional,
  MORALIS_API_KEY: optional,
  SOLANA_RPC_URL: optional.transform(
    (v) => v ?? "https://api.mainnet-beta.solana.com",
  ),

  GITHUB_TOKEN: optional,

  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_CHAT_ID: optional,
  TELEGRAM_IN_DEV: optional.transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server environment. Parsed lazily so builds work without a full `.env`. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
