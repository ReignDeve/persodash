import "server-only";

import { startOfDay } from "date-fns";

import { formatEur, formatHashrate, formatKm } from "@/lib/format";
import { escapeTelegram, sendTelegram } from "@/server/integrations/telegram";
import { getLogbookSummary } from "@/server/services/logbook";
import { getMinerOverview } from "@/server/services/miner";
import { buildWeeklyReview } from "@/server/services/review";
import { listMonitors } from "@/server/services/services";
import { listRoutines } from "@/server/services/routines";
import { listSubscriptions } from "@/server/services/subscriptions";
import { countSince } from "@/server/services/notifications";
import { getWalletsOverview } from "@/server/services/wallets";
import { getWebsites } from "@/server/services/websites";

/** Builds and sends the daily Telegram digest. */
export async function sendDailySummary() {
  const [miner, websites, wallets, logbook, alerts, services, subscriptions, routines] = await Promise.all([
    getMinerOverview(),
    getWebsites(),
    getWalletsOverview(),
    getLogbookSummary(),
    countSince(startOfDay(new Date())),
    listMonitors(),
    listSubscriptions(),
    listRoutines(),
  ]);

  const header = `<b>PersoDash · ${new Date().toLocaleDateString("de-DE")}</b>`;
  const lines: string[] = [];

  if (websites.status === "ok") {
    const down = websites.websites.filter((w) => w.health.state === "down");
    lines.push(
      `Websites   ${websites.websites.length - down.length}/${websites.websites.length} up`,
      ...down.map((w) => `  ↳ down: ${escapeTelegram(w.name)}`),
    );
  }
  const monitored = services.monitors.filter((m) => m.enabled);
  if (monitored.length) {
    const down = monitored.filter((m) => m.state === "down");
    lines.push(
      `Services   ${monitored.length - down.length}/${monitored.length} up`,
      ...down.map((m) => `  ↳ down: ${escapeTelegram(m.name)}`),
    );
  }
  if (miner.status === "ok") {
    lines.push(
      `Miner      ${miner.onlineCount}/${miner.workers.length} online · ${formatHashrate(miner.totalHashrate)}`,
    );
  }
  if (wallets.totalEur !== null) lines.push(`Portfolio  ${formatEur(wallets.totalEur)}`);
  lines.push(`Logbook    ${formatKm(logbook.thisMonthKilometers)} this month`);

  const dueRoutines = routines.items.filter((r) => r.bucket === "overdue" || r.bucket === "today");
  if (dueRoutines.length) {
    lines.push("", "Routines due", ...dueRoutines.map((r) => `  ${escapeTelegram(r.title)}`));
  }

  const upcoming = subscriptions.items.filter((i) => i.active && i.daysUntilRenewal <= 7);
  if (upcoming.length) {
    lines.push(
      "",
      "Renewing this week",
      ...upcoming.map((i) => `  ${escapeTelegram(i.name)} · ${i.daysUntilRenewal === 0 ? "today" : `in ${i.daysUntilRenewal}d`}`),
    );
  }

  const alertTotal = (alerts.warning ?? 0) + (alerts.error ?? 0);
  lines.push("", alertTotal ? `${alertTotal} alert(s) today` : "No alerts today");

  // Monospace block keeps the columns aligned in Telegram.
  return sendTelegram(`${header}\n<pre>${lines.join("\n")}</pre>`);
}

/** Sunday digest: the week's highlights as one Telegram message. */
export async function sendWeeklyReview() {
  const review = await buildWeeklyReview();
  const header = `<b>PersoDash · Week ${review.week.number}</b>`;
  const lines = review.highlights.length
    ? review.highlights.map((h) => `${h.tone === "err" ? "⛔" : h.tone === "warn" ? "⚠️" : "·"} ${escapeTelegram(h.text)}`)
    : ["A quiet week – nothing to report."];
  return sendTelegram(`${header}\n\n${lines.join("\n")}`);
}
