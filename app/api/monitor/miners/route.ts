import { NextResponse } from "next/server";
import { fetchWorkers, PublicPoolWorker } from "@/app/services/publicPoolService";
import { sendTelegramMessage } from "@/app/services/telegramService";
import { addNotification } from "../../../services/notificationService";

const BTC_ADDRESS = "bc1qt20zwyvgysgtkl2j66mslnut7nxqpzhjhxkqxl";
const HASHRATE_THRESHOLD = 1_000_000;
const INACTIVE_MINUTES = 10;

type AlertSeverity = "warning" | "error";

type AlertInfo = {
  worker: PublicPoolWorker;
  reasons: string[];
  severity: AlertSeverity;
};

function addAlertReason(
  map: Map<string, AlertInfo>,
  worker: PublicPoolWorker,
  reason: string,
  severity: AlertSeverity
) {
  const existing = map.get(worker.sessionId);
  if (existing) {
    existing.reasons.push(reason);
    if (severity === "error") existing.severity = "error";
  } else {
    map.set(worker.sessionId, {
      worker,
      reasons: [reason],
      severity,
    });
  }
}

export async function GET() {
  try {
    const workers = await fetchWorkers(BTC_ADDRESS);
    const now = Date.now();

    const alertsByWorker = new Map<string, AlertInfo>();

    // 🔍 Regel 1: Worker inaktiv
    for (const w of workers) {
      const last = new Date(w.lastSeen).getTime();
      const minutesSince = (now - last) / 1000 / 60;

      if (minutesSince > INACTIVE_MINUTES) {
        addAlertReason(
          alertsByWorker,
          w,
          `Inaktiv seit ${minutesSince.toFixed(1)} Minuten.`,
          "warning"
        );
      }
    }

    // 🔍 Regel 2: Hashrate 0
    for (const w of workers) {
      if (w.hashRate === 0) {
        addAlertReason(
          alertsByWorker,
          w,
          `Hashrate ist 0 H/s.`,
          "error"
        );
      }
    }

    // 🔍 Regel 3: Hashrate < Threshold
    for (const w of workers) {
      if (w.hashRate > 0 && w.hashRate < HASHRATE_THRESHOLD) {
        addAlertReason(
          alertsByWorker,
          w,
          `Hashrate nur ${w.hashRate.toFixed(2)} H/s (Threshold: ${HASHRATE_THRESHOLD})`,
          "warning"
        );
      }
    }

    const alerts = Array.from(alertsByWorker.values());

    for (const alert of alerts) {
      const { worker, reasons, severity } = alert;

      const title =
        severity === "error" ? "Miner-Worker PROBLEM" : "Miner-Worker Warnung";

      const msg = [
        `*${title}*`,
        ``,
        `Worker: ${worker.sessionId}`,
        `Hashrate: ${worker.hashRate.toFixed(2)} H/s`,
        ``,
        `Gründe:`,
        ...reasons.map((r) => `- ${r}`),
        ``,
        `Zeit: ${new Date().toLocaleString("de-DE")}`,
      ].join("\n");

      await sendTelegramMessage(msg);

      await addNotification({
        type: "miner",
        source: `miner:${BTC_ADDRESS}:${worker.sessionId}`,
        severity,
        title,
        message: msg,
      });
    }

    return NextResponse.json({
      ok: true,
      workersCount: workers.length,
      alertsSent: alerts.length,
    });
  } catch (e) {
    const text = `*Miner Monitor Fehler*\n\nPublic Pool API nicht erreichbar: ${(e as Error).message}`;

    await sendTelegramMessage(text);

    await addNotification({
      type: "miner",
      source: `miner:${BTC_ADDRESS}`,
      severity: "error",
      title: "Miner Monitor Fehler",
      message: text,
    });

    return NextResponse.json(
      { error: "monitor failed" },
      { status: 500 }
    );
  }
}
