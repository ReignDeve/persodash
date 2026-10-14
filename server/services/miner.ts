import "server-only";

import { subHours } from "date-fns";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import { formatHashrate } from "@/lib/format";
import type { MinerResponse, MinerWorker } from "@/lib/schemas/miner";
import { fetchPoolClient, type PoolWorker } from "@/server/integrations/public-pool";
import { notify, transitionAlert } from "@/server/services/notifications";
import { getSettings, setInternal } from "@/server/services/settings";

const HISTORY_HOURS = 48;
const SNAPSHOT_RETENTION_DAYS = 90;

function toWorker(
  w: PoolWorker,
  ctx: { now: number; mine?: string; minHashrate: number; inactiveMinutes: number },
): MinerWorker {
  const lastSeen = new Date(w.lastSeen).getTime();
  const online = ctx.now - lastSeen < ctx.inactiveMinutes * 60_000;
  return {
    sessionId: w.sessionId,
    name: w.name,
    hashrate: w.hashRate,
    bestDifficulty: w.bestDifficulty,
    startedAt: new Date(w.startTime).toISOString(),
    lastSeenAt: new Date(w.lastSeen).toISOString(),
    online,
    belowThreshold: online && w.hashRate < ctx.minHashrate,
    isMine: ctx.mine !== undefined && w.sessionId === ctx.mine,
  };
}

async function loadWorkers() {
  const { BTC_ADDRESS, WORKER } = env();
  if (!BTC_ADDRESS) return null;

  const [client, settings] = await Promise.all([fetchPoolClient(BTC_ADDRESS), getSettings()]);
  const now = Date.now();
  const workers = client.workers
    .map((w) => toWorker(w, { now, mine: WORKER, ...settings.miner }))
    // Own worker first, then by hashrate.
    .sort((a, b) => Number(b.isMine) - Number(a.isMine) || b.hashrate - a.hashrate);

  return { address: BTC_ADDRESS, client, workers, settings };
}

export async function getMinerOverview(): Promise<MinerResponse> {
  let loaded;
  try {
    loaded = await loadWorkers();
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "Public Pool returned unexpected data.",
    };
  }
  if (!loaded) {
    return { status: "not_configured", message: "Set BTC_ADDRESS to track your mining workers." };
  }

  const { address, client, workers, settings } = loaded;
  const snapshots = await db.minerSnapshot.findMany({
    where: { takenAt: { gte: subHours(new Date(), HISTORY_HOURS) } },
    orderBy: { takenAt: "asc" },
    select: { takenAt: true, totalHashrate: true },
  });

  return {
    status: "ok",
    address,
    workers,
    totalHashrate: workers.reduce((sum, w) => sum + w.hashrate, 0),
    bestDifficulty: client.bestDifficulty,
    onlineCount: workers.filter((w) => w.online).length,
    history: snapshots.map((s) => ({ t: s.takenAt.toISOString(), hashrate: s.totalHashrate })),
    thresholds: settings.miner,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Scheduled job: stores a snapshot for the history chart and raises/resolves
 * alerts on state transitions. Replaces the old per-page-view alerting.
 */
export async function runMinerMonitor() {
  let loaded;
  try {
    loaded = await loadWorkers();
  } catch (error) {
    const change = await transitionAlert("miner:pool", true);
    if (change === "raised") {
      await notify({
        category: "miner",
        severity: "error",
        title: "Public Pool unreachable",
        message: `Could not load worker data: ${(error as Error).message}`,
        source: "miner:pool",
      });
    }
    return { ok: false as const };
  }
  if (!loaded) return { ok: false as const, reason: "not_configured" };

  const { workers, client, settings } = loaded;
  await transitionAlert("miner:pool", false);

  await db.minerSnapshot.create({
    data: {
      workerCount: workers.length,
      totalHashrate: workers.reduce((sum, w) => sum + w.hashrate, 0),
      bestDifficulty: client.bestDifficulty,
      workers: Object.fromEntries(workers.map((w) => [w.sessionId, w.hashrate])),
    },
  });

  let raised = 0;

  // Workers that stop entirely disappear from the pool response, so "nothing
  // connected" needs its own alert.
  const none = await transitionAlert("miner:none", workers.length === 0);
  if (none === "raised") {
    raised++;
    await notify({
      category: "miner",
      severity: "error",
      title: "No mining workers connected",
      message: "Public Pool reports no active sessions for your address.",
      source: "miner:none",
    });
  } else if (none === "resolved") {
    await notify({
      category: "miner",
      severity: "info",
      title: "Mining resumed",
      message: `${workers.length} worker(s) connected again.`,
      source: "miner:none",
    });
  }

  for (const w of workers) {
    const problems: string[] = [];
    if (!w.online) problems.push(`not seen for more than ${settings.miner.inactiveMinutes} min`);
    if (w.online && w.hashrate === 0) problems.push("hashrate is 0 H/s");
    else if (w.belowThreshold)
      problems.push(
        `hashrate ${formatHashrate(w.hashrate)} below ${formatHashrate(settings.miner.minHashrate)}`,
      );

    const key = `miner:worker:${w.sessionId}`;
    const change = await transitionAlert(key, problems.length > 0);
    if (change === "raised") {
      raised++;
      await notify({
        category: "miner",
        severity: w.online ? "warning" : "error",
        title: `Worker ${w.name || w.sessionId} needs attention`,
        message: problems.join("; "),
        source: key,
      });
    } else if (change === "resolved") {
      await notify({
        category: "miner",
        severity: "info",
        title: `Worker ${w.name || w.sessionId} recovered`,
        message: `Back at ${formatHashrate(w.hashrate)}.`,
        source: key,
      });
    }
  }

  await setInternal("scheduler:lastMinerRun", new Date().toISOString());
  await db.minerSnapshot.deleteMany({
    where: { takenAt: { lt: subHours(new Date(), SNAPSHOT_RETENTION_DAYS * 24) } },
  });

  return { ok: true as const, workers: workers.length, raised };
}
