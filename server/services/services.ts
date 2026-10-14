import "server-only";

import { subDays, subHours } from "date-fns";

import { db } from "@/lib/db";
import type { MonitorInput, MonitorSummary, ServicesResponse, UptimeDay } from "@/lib/schemas/services";
import { fetchWithTimeout } from "@/server/cache";
import { notify, transitionAlert } from "@/server/services/notifications";

/** How often the scheduler checks every enabled monitor. */
export const CHECK_INTERVAL_MINUTES = 2;
const CHECK_TIMEOUT_MS = 8000;
const CHECK_ATTEMPTS = 2;
const HISTORY_DAYS = 30;
const RETENTION_DAYS = 45;

type CheckResult = { ok: boolean; statusCode: number | null; latencyMs: number | null; error: string | null };

async function probe(url: string, expectedStatus: number | null): Promise<CheckResult> {
  const started = performance.now();
  try {
    // GET (not HEAD): many self-hosted APIs don't implement HEAD.
    const res = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
      timeoutMs: CHECK_TIMEOUT_MS,
      headers: { "User-Agent": "PersoDash-Monitor/1.0" },
    });
    void res.body?.cancel();
    const ok = expectedStatus ? res.status === expectedStatus : res.status < 400;
    return {
      ok,
      statusCode: res.status,
      latencyMs: Math.round(performance.now() - started),
      error: ok ? null : `Unexpected status ${res.status}`,
    };
  } catch (error) {
    const err = error as Error & { cause?: { code?: string } };
    return {
      ok: false,
      statusCode: null,
      latencyMs: null,
      error: err.name === "TimeoutError" ? "Timed out" : (err.cause?.code ?? err.message),
    };
  }
}

/** Retries once so a single dropped packet does not count as an outage. */
async function check(url: string, expectedStatus: number | null) {
  let result = await probe(url, expectedStatus);
  for (let attempt = 2; !result.ok && attempt <= CHECK_ATTEMPTS; attempt++) {
    result = await probe(url, expectedStatus);
  }
  return result;
}

async function checkAndRecord(monitor: { id: string; name: string; url: string; expectedStatus: number | null }) {
  const result = await check(monitor.url, monitor.expectedStatus);
  await db.monitorCheck.create({ data: { monitorId: monitor.id, ...result } });

  const change = await transitionAlert(`monitor:${monitor.id}`, !result.ok);
  if (change === "raised") {
    await notify({
      category: "service",
      severity: "error",
      title: `${monitor.name} is down`,
      message: `${monitor.url}\n${result.error ?? "No response"}`,
      source: `monitor:${monitor.id}`,
    });
  } else if (change === "resolved") {
    await notify({
      category: "service",
      severity: "info",
      title: `${monitor.name} is back up`,
      message: `${monitor.url} responded with ${result.statusCode} in ${result.latencyMs} ms.`,
      source: `monitor:${monitor.id}`,
    });
  }
  return result;
}

/** Scheduled job: checks every enabled monitor in parallel. */
export async function runMonitors() {
  const monitors = await db.monitor.findMany({ where: { enabled: true } });
  const results = await Promise.all(monitors.map(checkAndRecord));
  await db.monitorCheck.deleteMany({ where: { checkedAt: { lt: subDays(new Date(), RETENTION_DAYS) } } });
  return { checked: monitors.length, down: results.filter((r) => !r.ok).length };
}

export async function checkMonitorNow(id: string) {
  const monitor = await db.monitor.findUniqueOrThrow({ where: { id } });
  return checkAndRecord(monitor);
}

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

const ratio = (ok: number, total: number) => (total ? (ok / total) * 100 : null);
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

type DayRow = { monitorId: string; day: string; checks: number; failures: number };

/** Start of the current up/down streak: the first check after the last opposite result. */
async function streakStart(monitorId: string, lastOk: boolean) {
  const flip = await db.monitorCheck.findFirst({
    where: { monitorId, ok: !lastOk },
    orderBy: { checkedAt: "desc" },
    select: { checkedAt: true },
  });
  const first = await db.monitorCheck.findFirst({
    where: { monitorId, ...(flip ? { checkedAt: { gt: flip.checkedAt } } : {}) },
    orderBy: { checkedAt: "asc" },
    select: { checkedAt: true },
  });
  return first?.checkedAt ?? null;
}

export async function listMonitors(): Promise<ServicesResponse> {
  const now = new Date();
  const since24h = subHours(now, 24);
  const dayKeys = Array.from({ length: HISTORY_DAYS }, (_, i) => utcDay(subDays(now, HISTORY_DAYS - 1 - i)));
  const since30d = new Date(`${dayKeys[0]}T00:00:00.000Z`);

  // 30 days of checks are aggregated in the database (thousands of rows per
  // monitor); only the last 24h are loaded individually for the latency chart.
  const [monitors, dayRows, recent] = await Promise.all([
    db.monitor.findMany({ orderBy: { createdAt: "asc" }, include: { project: { select: { id: true, name: true } } } }),
    db.$queryRaw<DayRow[]>`
      SELECT "monitorId",
             to_char("checkedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             count(*)::int AS checks,
             count(*) FILTER (WHERE NOT ok)::int AS failures
      FROM monitor_checks
      WHERE "checkedAt" >= ${since30d}
      GROUP BY 1, 2`,
    db.monitorCheck.findMany({
      where: { checkedAt: { gte: since24h } },
      orderBy: { checkedAt: "asc" },
      select: { monitorId: true, checkedAt: true, ok: true, statusCode: true, latencyMs: true, error: true },
    }),
  ]);

  const summaries = await Promise.all(
    monitors.map(async (m): Promise<MonitorSummary> => {
      const rows = dayRows.filter((r) => r.monitorId === m.id);
      const days: UptimeDay[] = dayKeys.map((day) => {
        const row = rows.find((r) => r.day === day);
        return { day, checks: row?.checks ?? 0, failures: row?.failures ?? 0 };
      });
      const total = days.reduce((s, d) => s + d.checks, 0);
      const failed = days.reduce((s, d) => s + d.failures, 0);

      const last24 = recent.filter((c) => c.monitorId === m.id);
      const last =
        last24.at(-1) ??
        (await db.monitorCheck.findFirst({ where: { monitorId: m.id }, orderBy: { checkedAt: "desc" } }));
      const latencies = last24.map((c) => c.latencyMs).filter((v): v is number => v !== null);
      const since = last ? await streakStart(m.id, last.ok) : null;

      return {
        id: m.id,
        name: m.name,
        url: m.url,
        expectedStatus: m.expectedStatus,
        enabled: m.enabled,
        project: m.project,
        state: !m.enabled ? "paused" : !last ? "pending" : last.ok ? "up" : "down",
        lastCheck: last
          ? { at: last.checkedAt.toISOString(), statusCode: last.statusCode, latencyMs: last.latencyMs, error: last.error }
          : null,
        since: since?.toISOString() ?? null,
        uptime24h: ratio(last24.filter((c) => c.ok).length, last24.length),
        uptime30d: ratio(total - failed, total),
        avgLatency24h: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
        days,
        latency: last24.map((c) => ({ t: c.checkedAt.toISOString(), ms: c.latencyMs })),
      };
    }),
  );

  return { monitors: summaries, intervalMinutes: CHECK_INTERVAL_MINUTES };
}

export async function createMonitor(input: MonitorInput) {
  const monitor = await db.monitor.create({ data: input });
  // First result right away instead of waiting for the next scheduler tick.
  await checkAndRecord(monitor);
  return monitor;
}

export async function updateMonitor(id: string, input: MonitorInput) {
  return db.monitor.update({ where: { id }, data: input });
}

export async function deleteMonitor(id: string) {
  await db.$transaction([
    db.monitor.delete({ where: { id } }),
    db.alertState.deleteMany({ where: { key: `monitor:${id}` } }),
  ]);
}
