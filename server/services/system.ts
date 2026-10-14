import "server-only";

import { statfs } from "node:fs/promises";
import os from "node:os";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { SystemStatus } from "@/lib/schemas/overview";
import type { IntegrationStatus } from "@/lib/schemas/settings";
import { isTelegramConfigured } from "@/server/integrations/telegram";

async function diskUsage() {
  try {
    const s = await statfs(process.platform === "win32" ? process.cwd().slice(0, 3) : "/");
    const total = s.blocks * s.bsize;
    return { total, used: total - s.bavail * s.bsize };
  } catch {
    return null;
  }
}

async function databaseHealth() {
  const started = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

/** Host the dashboard runs on – on the VPS this is the server itself. */
export async function getSystemStatus(): Promise<SystemStatus> {
  const [disk, database] = await Promise.all([diskUsage(), databaseHealth()]);
  const total = os.totalmem();
  const [l1, l5, l15] = os.loadavg();
  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    uptimeSeconds: Math.round(os.uptime()),
    load: [l1, l5, l15],
    cpuCount: os.cpus().length,
    memory: { total, used: total - os.freemem() },
    disk,
    database,
    nodeVersion: process.version,
  };
}

export function getIntegrations(): IntegrationStatus[] {
  const e = env();
  return [
    {
      key: "public-pool",
      name: "Public Pool",
      description: "Mining workers and hashrate",
      configured: Boolean(e.BTC_ADDRESS),
      envVars: ["BTC_ADDRESS", "WORKER"],
    },
    {
      key: "vercel",
      name: "Vercel",
      description: "Projects, deployments and domains",
      configured: Boolean(e.VERCEL_API_TOKEN),
      envVars: ["VERCEL_API_TOKEN", "VERCEL_TEAM_ID"],
    },
    {
      key: "github",
      name: "GitHub",
      description: "Repository activity for projects (public repos work without it)",
      configured: Boolean(e.GITHUB_TOKEN),
      envVars: ["GITHUB_TOKEN"],
    },
    {
      key: "coinbase",
      name: "Coinbase",
      description: "Exchange balances",
      configured: Boolean(e.COINBASE_API_KEY_ID && e.COINBASE_API_KEY_SECRET),
      envVars: ["COINBASE_API_KEY_ID", "COINBASE_API_KEY_SECRET"],
    },
    {
      key: "moralis",
      name: "Moralis",
      description: "SPL tokens on Solana wallets",
      configured: Boolean(e.MORALIS_API_KEY),
      envVars: ["MORALIS_API_KEY"],
    },
    {
      key: "telegram",
      name: "Telegram",
      description: "Push delivery for alerts and the daily summary",
      configured: isTelegramConfigured(),
      envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    },
    {
      key: "cron",
      name: "External cron",
      description: "Optional trigger for /api/cron/* from outside the app",
      configured: Boolean(e.CRON_SECRET),
      envVars: ["CRON_SECRET"],
    },
  ];
}
