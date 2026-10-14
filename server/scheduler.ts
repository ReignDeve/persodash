import "server-only";

import { format } from "date-fns";

import { env } from "@/lib/env";
import { purgeExpiredSessions } from "@/server/services/auth";
import { runMinerMonitor } from "@/server/services/miner";
import { CHECK_INTERVAL_MINUTES, runMonitors } from "@/server/services/services";
import { runRenewalReminders } from "@/server/services/subscriptions";
import { getInternal, getSettings, setInternal } from "@/server/services/settings";
import { snapshotPortfolio } from "@/server/services/review";
import { runRoutineReminders } from "@/server/services/routines";
import { sendDailySummary, sendWeeklyReview } from "@/server/services/summary";

// In-process scheduler. PersoDash is a single long-running Node process on the
// VPS, so plain intervals are enough – no external cron needed. The same jobs
// are exposed under /api/cron/* for setups that prefer an external trigger.

const MINUTE = 60_000;
const MINER_INTERVAL_MS = 10 * MINUTE;
const SUMMARY_CHECK_MS = 5 * MINUTE;
const STARTUP_DELAY_MS = 30_000;

const globalForScheduler = globalThis as unknown as { persodashScheduler?: boolean };

async function safely(name: string, job: () => Promise<unknown>) {
  try {
    await job();
  } catch (error) {
    console.error(`[scheduler] ${name} failed`, error);
  }
}

/** Sends the daily summary once per day, after the configured hour. */
export async function maybeSendDailySummary(force = false) {
  const { notifications } = await getSettings();
  if (!force && !notifications.dailySummaryEnabled) return { sent: false, reason: "disabled" };

  const today = format(new Date(), "yyyy-MM-dd");
  const last = await getInternal<string>("scheduler:lastSummaryDate");
  if (!force && (last === today || new Date().getHours() < notifications.dailySummaryHour)) {
    return { sent: false, reason: "not_due" };
  }

  const sent = await sendDailySummary();
  if (sent) await setInternal("scheduler:lastSummaryDate", today);
  return { sent };
}

/** Sends the weekly review once, on Sunday after the daily-summary hour. */
export async function maybeSendWeeklyReview(force = false) {
  const { notifications } = await getSettings();
  if (!force && !notifications.weeklyReviewEnabled) return { sent: false, reason: "disabled" };

  const now = new Date();
  const weekKey = format(now, "RRRR-'W'II");
  const last = await getInternal<string>("scheduler:lastWeeklyReview");
  const isSunday = now.getDay() === 0;
  if (!force && (!isSunday || last === weekKey || now.getHours() < notifications.dailySummaryHour)) {
    return { sent: false, reason: "not_due" };
  }

  const sent = await sendWeeklyReview();
  if (sent) await setInternal("scheduler:lastWeeklyReview", weekKey);
  return { sent };
}

export function startScheduler() {
  if (globalForScheduler.persodashScheduler) return;
  if (!env().SCHEDULER_ENABLED) {
    console.info("[scheduler] disabled via SCHEDULER_ENABLED=false");
    return;
  }
  globalForScheduler.persodashScheduler = true;
  console.info("[scheduler] started");

  const miner = () => safely("miner", runMinerMonitor);
  const summary = () => safely("daily-summary", () => maybeSendDailySummary());
  const housekeeping = () => safely("sessions", purgeExpiredSessions);
  const monitors = () => safely("monitors", runMonitors);
  const renewals = () => safely("renewals", runRenewalReminders);
  const routines = () => safely("routines", runRoutineReminders);
  const portfolio = () => safely("portfolio", snapshotPortfolio);
  const weekly = () => safely("weekly-review", () => maybeSendWeeklyReview());

  setTimeout(() => {
    void miner();
    void monitors();
    void renewals();
    void routines();
    void portfolio();
    void housekeeping();
  }, STARTUP_DELAY_MS);
  setInterval(monitors, CHECK_INTERVAL_MINUTES * MINUTE).unref();
  setInterval(renewals, 60 * MINUTE).unref();
  setInterval(routines, 30 * MINUTE).unref();
  setInterval(portfolio, 60 * MINUTE).unref();
  setInterval(weekly, SUMMARY_CHECK_MS).unref();
  setInterval(miner, MINER_INTERVAL_MS).unref();
  setInterval(summary, SUMMARY_CHECK_MS).unref();
  setInterval(housekeeping, 24 * 60 * MINUTE).unref();
}
