// app/api/notifications/daily-summary/route.ts
import { NextResponse } from "next/server";
import {
  listNotificationsForToday,
} from "../../../services/notificationService";
import { sendTelegramMessage } from "@/app/services/telegramService";
import { fetchWorkers } from "@/app/services/publicPoolService";

const BTC_ADDRESS = "bc1qt20zwyvgysgtkl2j66mslnut7nxqpzhjhxkqxl";

export async function GET() {
  try {
    const todayNotifs = listNotificationsForToday();

    const websiteNotifs = todayNotifs.filter((n) => n.type === "website");  
    const websiteOutages = websiteNotifs.filter(
      (n) => n.severity === "error"
    ).length;

    // Webseiten-Status sehr simpel:
    const websitesOk = websiteOutages === 0 ? "Ja ✅" : "Teilweise ⚠️";

    // Miner-Daten von Public Pool
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
      `🌐 Webseiten online: ${websitesOk}`,
      `   - Ausfälle heute: ${websiteOutages}`,
      "",
      `⛏️ Miner:`,
      `   - Anzahl Worker: ${workerCount}`,
      `   - Beste Difficulty: ${bestDifficulty.toFixed(2)}`,
      "",
      `🔔 Notifications heute: ${todayNotifs.length}`,
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
