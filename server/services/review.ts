import "server-only";

import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  startOfISOWeek,
} from "date-fns";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { addSteps, fromDateOnly, toDateOnly, today } from "@/lib/dates";
import { formatEur, formatHashrate, formatKm, formatNumber } from "@/lib/format";
import type { WeeklyReview } from "@/lib/schemas/review";
import { CYCLE_MONTHS } from "@/lib/schemas/subscriptions";
import { fetchCommitCount } from "@/server/integrations/github";
import { fetchPricesSafe } from "@/server/integrations/prices";
import { fetchDeploymentsBetween } from "@/server/integrations/vercel";
import { getWalletsOverview } from "@/server/services/wallets";

const WEEK_ID = /^(\d{4})-W(\d{2})$/;

/** Monday (local) of the ISO week given as "2026-W41"; defaults to the current week. */
export function resolveWeek(id?: string) {
  const match = id?.match(WEEK_ID);
  const base = match
    ? startOfISOWeek(setISOWeek(new Date(Number(match[1]), 0, 4), Number(match[2])))
    : startOfISOWeek(new Date());
  return base;
}

const weekId = (monday: Date) => `${getISOWeekYear(monday)}-W${String(getISOWeek(monday)).padStart(2, "0")}`;

/** All renewal dates of a subscription inside [start, end], derived from its next renewal. */
function renewalsBetween(nextRenewal: Date, cycle: keyof typeof CYCLE_MONTHS, start: Date, end: Date) {
  const months = CYCLE_MONTHS[cycle];
  let d = nextRenewal;
  while (d > end) d = addSteps(d, "monthly", -months);
  while (d < start) d = addSteps(d, "monthly", months);
  const dates: Date[] = [];
  for (; d <= end; d = addSteps(d, "monthly", months)) dates.push(d);
  return dates;
}

export async function buildWeeklyReview(id?: string): Promise<WeeklyReview> {
  const monday = resolveWeek(id);
  const nextMonday = addWeeks(monday, 1);
  const startDay = fromDateOnly(format(monday, "yyyy-MM-dd"));
  const endDay = fromDateOnly(format(addDays(monday, 6), "yyyy-MM-dd"));
  const prevStartDay = fromDateOnly(format(addWeeks(monday, -1), "yyyy-MM-dd"));
  const isCurrent = weekId(monday) === weekId(new Date());
  const range = { gte: monday, lt: nextMonday };

  const [
    trips,
    prevTrips,
    projects,
    monitors,
    checkRows,
    incidents,
    notesCaptured,
    notesDone,
    notesOpen,
    completions,
    missedRoutines,
    alerts,
    snapshots,
    subscriptions,
    minerSnaps,
    prices,
  ] = await Promise.all([
    db.logbookEntry.findMany({ where: { date: { gte: startDay, lte: endDay } }, orderBy: { date: "asc" } }),
    db.logbookEntry.aggregate({ _sum: { kilometers: true }, where: { date: { gte: prevStartDay, lt: startDay } } }),
    db.project.findMany({ where: { status: { in: ["active", "paused"] } } }),
    db.monitor.findMany({ where: { enabled: true } }),
    db.$queryRaw<{ monitorId: string; checks: number; failures: number }[]>`
      SELECT "monitorId", count(*)::int AS checks, count(*) FILTER (WHERE NOT ok)::int AS failures
      FROM monitor_checks WHERE "checkedAt" >= ${monday} AND "checkedAt" < ${nextMonday}
      GROUP BY 1`,
    db.notification.findMany({
      where: { category: "service", severity: "error", createdAt: range },
      select: { source: true },
    }),
    db.note.count({ where: { createdAt: range } }),
    db.note.count({ where: { doneAt: range } }),
    db.note.count({ where: { doneAt: null } }),
    db.routineCompletion.findMany({ where: { doneAt: range }, include: { routine: { select: { title: true } } } }),
    // Still open although they were due within this week (or earlier, for the current week).
    db.routine.findMany({
      where: { active: true, nextDue: { gte: startDay, lte: isCurrent ? addSteps(today(), "daily", -1) : endDay } },
      select: { title: true },
    }),
    db.notification.groupBy({
      by: ["severity"],
      where: { createdAt: range, severity: { in: ["warning", "error"] } },
      _count: true,
    }),
    db.portfolioSnapshot.findMany({ where: { day: { gte: startDay, lte: endDay } }, orderBy: { day: "asc" } }),
    db.subscription.findMany({ where: { active: true } }),
    db.minerSnapshot.findMany({ where: { takenAt: range }, select: { totalHashrate: true, workerCount: true } }),
    fetchPricesSafe(),
  ]);

  // ---- logbook ----------------------------------------------------------
  const km = trips.reduce((s, t) => s + t.kilometers, 0);
  const previousKm = prevTrips._sum.kilometers ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = toDateOnly(addSteps(startDay, "daily", i));
    return { day, km: trips.filter((t) => toDateOnly(t.date) === day).reduce((s, t) => s + t.kilometers, 0) };
  });

  // ---- code: commits (GitHub) and production deploys (Vercel) ------------
  const sinceIso = monday.toISOString();
  const untilIso = nextMonday.toISOString();
  const { VERCEL_API_TOKEN, VERCEL_TEAM_ID } = env();
  const deployments = VERCEL_API_TOKEN
    ? await fetchDeploymentsBetween({ token: VERCEL_API_TOKEN, teamId: VERCEL_TEAM_ID }, +monday, +nextMonday).catch(
        () => [],
      )
    : [];
  const codeProjects = await Promise.all(
    projects.map(async (p) => ({
      name: p.name,
      commits: p.repo ? await fetchCommitCount(p.repo, sinceIso, untilIso).catch(() => 0) : 0,
      deployments: p.vercelProject ? deployments.filter((d) => d.project === p.vercelProject).length : 0,
    })),
  );
  const activeCode = codeProjects.filter((p) => p.commits || p.deployments).sort((a, b) => b.commits - a.commits);
  const commits = codeProjects.reduce((s, p) => s + p.commits, 0);

  // ---- services ---------------------------------------------------------
  const serviceRows = monitors.map((m) => {
    const row = checkRows.find((r) => r.monitorId === m.id);
    return {
      name: m.name,
      uptime: row && row.checks ? ((row.checks - row.failures) / row.checks) * 100 : null,
      incidents: incidents.filter((i) => i.source === `monitor:${m.id}`).length,
    };
  });

  // ---- routines ---------------------------------------------------------
  const done = completions.filter((c) => c.outcome === "done");
  const skipped = completions.filter((c) => c.outcome === "skipped");
  const routineItems = [
    ...done.map((c) => ({ title: c.routine.title, outcome: "done" as const })),
    ...skipped.map((c) => ({ title: c.routine.title, outcome: "skipped" as const })),
    ...missedRoutines.map((r) => ({ title: r.title, outcome: "missed" as const })),
  ];

  // ---- money --------------------------------------------------------------
  const portfolioStart = snapshots[0]?.totalEur ?? null;
  const portfolioEnd = snapshots.at(-1)?.totalEur ?? null;
  const renewals = subscriptions
    .flatMap((s) =>
      renewalsBetween(s.nextRenewal, s.cycle, startDay, endDay).map((date) => {
        const amount = s.amountCents / 100;
        const eur = s.currency === "EUR" ? amount : prices.usdToEur ? amount * prices.usdToEur : 0;
        return {
          name: s.name,
          date: toDateOnly(date),
          amount: amount.toLocaleString("de-DE", { style: "currency", currency: s.currency }),
          eur,
        };
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---- miner ------------------------------------------------------------
  const avgHashrate = minerSnaps.length
    ? minerSnaps.reduce((s, m) => s + m.totalHashrate, 0) / minerSnaps.length
    : null;
  const onlineShare = minerSnaps.length
    ? (minerSnaps.filter((m) => m.workerCount > 0).length / minerSnaps.length) * 100
    : null;

  const alertCounts = Object.fromEntries(alerts.map((a) => [a.severity, a._count])) as Record<string, number>;
  const totalIncidents = serviceRows.reduce((s, m) => s + m.incidents, 0);

  // ---- highlights: the week in a few sentences ---------------------------
  const highlights: WeeklyReview["highlights"] = [];
  if (km > 0 || previousKm > 0) {
    const delta = km - previousKm;
    highlights.push({
      tone: "info",
      text: `Drove ${formatKm(km)}${previousKm ? ` (${delta >= 0 ? "+" : "−"}${formatNumber(Math.abs(delta))} km vs last week)` : ""}.`,
    });
  }
  if (commits || deployments.length) {
    highlights.push({
      tone: "info",
      text: `${commits} commit${commits === 1 ? "" : "s"} and ${deployments.length} deploy${deployments.length === 1 ? "" : "s"}${activeCode.length ? ` across ${activeCode.length} project${activeCode.length === 1 ? "" : "s"}` : ""}.`,
    });
  }
  if (serviceRows.length) {
    const worst = serviceRows.filter((s) => s.uptime !== null).sort((a, b) => a.uptime! - b.uptime!)[0];
    highlights.push(
      totalIncidents
        ? { tone: "err", text: `${totalIncidents} outage${totalIncidents === 1 ? "" : "s"}${worst ? ` – lowest uptime ${worst.name} at ${worst.uptime!.toFixed(2)} %` : ""}.` }
        : { tone: "ok", text: "All services stayed up." },
    );
  }
  if (routineItems.length) {
    highlights.push(
      missedRoutines.length
        ? { tone: "warn", text: `${done.length} routine${done.length === 1 ? "" : "s"} done, ${missedRoutines.length} still open.` }
        : { tone: "ok", text: `${done.length} routine${done.length === 1 ? "" : "s"} done – nothing missed.` },
    );
  }
  if (notesCaptured || notesDone) {
    highlights.push({ tone: "info", text: `Captured ${notesCaptured} note${notesCaptured === 1 ? "" : "s"}, cleared ${notesDone}. ${notesOpen} open in the inbox.` });
  }
  if (portfolioStart !== null && portfolioEnd !== null && snapshots.length > 1) {
    const change = portfolioEnd - portfolioStart;
    highlights.push({
      tone: "info",
      text: `Portfolio ${change >= 0 ? "up" : "down"} ${formatEur(Math.abs(change))} to ${formatEur(portfolioEnd)}.`,
    });
  }
  if (renewals.length) {
    highlights.push({
      tone: "info",
      text: `${renewals.length} renewal${renewals.length === 1 ? "" : "s"} (${formatEur(renewals.reduce((s, r) => s + r.eur, 0))}).`,
    });
  }
  if (avgHashrate !== null) {
    highlights.push({
      tone: onlineShare !== null && onlineShare < 90 ? "warn" : "info",
      text: `Miner averaged ${formatHashrate(avgHashrate)}, online ${Math.round(onlineShare ?? 0)} % of the time.`,
    });
  }

  return {
    week: {
      id: weekId(monday),
      number: getISOWeek(monday),
      start: format(monday, "yyyy-MM-dd"),
      end: format(addDays(monday, 6), "yyyy-MM-dd"),
      isCurrent,
      previous: weekId(addWeeks(monday, -1)),
      next: isCurrent ? null : weekId(nextMonday),
    },
    highlights,
    logbook: { km, previousKm, trips: trips.length, businessKm: trips.filter((t) => t.type === "business").reduce((s, t) => s + t.kilometers, 0), days },
    code: { configured: Boolean(VERCEL_API_TOKEN), commits, deployments: deployments.length, projects: activeCode },
    services: { monitors: serviceRows, incidents: totalIncidents },
    inbox: { captured: notesCaptured, done: notesDone, open: notesOpen },
    routines: { done: done.length, skipped: skipped.length, missed: missedRoutines.length, items: routineItems },
    alerts: { warning: alertCounts.warning ?? 0, error: alertCounts.error ?? 0 },
    money: {
      portfolioStart,
      portfolioEnd,
      renewals: renewals.map((r) => ({ name: r.name, date: r.date, amount: r.amount })),
      renewalsEur: renewals.reduce((s, r) => s + r.eur, 0),
    },
    miner: { avgHashrate, onlineShare },
  };
}

/** Scheduled: stores today's portfolio total once a day (feeds the weekly change). */
export async function snapshotPortfolio() {
  const day = today();
  const existing = await db.portfolioSnapshot.findUnique({ where: { day } });
  if (existing) return { skipped: true };
  const { totalEur } = await getWalletsOverview();
  if (totalEur === null) return { skipped: true };
  await db.portfolioSnapshot.create({ data: { day, totalEur } });
  return { stored: totalEur };
}
