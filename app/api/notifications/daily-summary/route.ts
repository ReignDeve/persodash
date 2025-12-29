// app/api/notifications/daily-summary/route.ts
import { NextResponse } from "next/server";
import { listNotificationsForToday } from "../../../services/notificationService";
import { sendTelegramMessage } from "@/app/services/telegramService";
import { fetchWorkers } from "@/app/services/publicPoolService";

// Summary:
// This enables custom daily summary notifications through Telegram,
// providing an overview of website statuses and miner statistics.
// Will be sent once a day via a scheduled job.
// Currently, relatively simple and static, could be enhanced with user settings later.

const BTC_ADDRESS = process.env.BTC_ADDRESS || "";

export async function GET() {
  try {
    const todayNotifs = listNotificationsForToday();

    const websiteNotifs = todayNotifs.filter((n) => n.type === "website");
    const websiteOutages = websiteNotifs.filter(
      (n) => n.severity === "error"
    ).length;

    // Website Status very simple:
    const websitesOk = websiteOutages === 0 ? "Yes ✅" : "Partly ⚠️";

    // Miner Data from Public Pool
    const workers = await fetchWorkers(BTC_ADDRESS);
    const bestDifficulty = workers.reduce(
      (max, w) => (w.bestDifficulty > max ? w.bestDifficulty : max),
      0
    );

    const workerCount = workers.length;

    const now = new Date();
    const dateStr = now.toLocaleDateString("de-DE");

    const lines: string[] = [
      `*PersoDash Daily Summary* – ${dateStr}`,
      "",
      `🌐 Websites online: ${websitesOk}`,
      `   - Outages today: ${websiteOutages}`,
      "",
      `⛏️ Miner:`,
      `   - Worker count: ${workerCount}`,
      `   - Best Difficulty: ${bestDifficulty.toFixed(2)}`,
      "",
      `🔔 Notifications today: ${todayNotifs.length}`,
    ];

    await sendTelegramMessage(lines.join("\n"));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("daily-summary error", e);
    return NextResponse.json(
      { error: "Failed to send daily summary" },
      { status: 500 }
    );
  }
}
