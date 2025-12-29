import { NextResponse } from "next/server";
import {
  fetchWorkers,
  PublicPoolWorker,
} from "@/app/services/publicPoolService";
import { sendTelegramMessage } from "@/app/services/telegramService";
import { addNotification } from "../../../services/notificationService";
import { AlertInfo, AlertSeverity } from "@/types/alert";

const BTC_ADDRESS = process.env.BTC_ADDRESS || "";
const HASHRATE_THRESHOLD = 1_000_000; // should be configurable in the future through user settings or config file
const INACTIVE_MINUTES = 10;

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

    // Rule 1: Worker inaktiv
    for (const w of workers) {
      const last = new Date(w.lastSeen).getTime();
      const minutesSince = (now - last) / 1000 / 60;

      if (minutesSince > INACTIVE_MINUTES) {
        addAlertReason(
          alertsByWorker,
          w,
          `Inaktiv since ${minutesSince.toFixed(1)} minutes.`,
          "warning"
        );
      }
    }

    // Rule 2: Hashrate 0
    for (const w of workers) {
      if (w.hashRate === 0) {
        addAlertReason(alertsByWorker, w, `Hashrate is 0 H/s.`, "error");
      }
    }

    // Rule 3: Hashrate < Threshold
    for (const w of workers) {
      if (w.hashRate > 0 && w.hashRate < HASHRATE_THRESHOLD) {
        addAlertReason(
          alertsByWorker,
          w,
          `Hashrate only ${w.hashRate.toFixed(2)} H/s (Threshold: ${HASHRATE_THRESHOLD})`,
          "warning"
        );
      }
    }

    const alerts = Array.from(alertsByWorker.values());

    for (const alert of alerts) {
      const { worker, reasons, severity } = alert;

      const title =
        severity === "error" ? "Miner-Worker PROBLEM" : "Miner-Worker Warning";

      const msg = [
        `*${title}*`,
        ``,
        `Worker: ${worker.sessionId}`,
        `Hashrate: ${worker.hashRate.toFixed(2)} H/s`,
        ``,
        `Reasons:`,
        ...reasons.map((r) => `- ${r}`),
        ``,
        `Time: ${new Date().toLocaleString("de-DE")}`,
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
    const text = `*Miner monitor error*\n\nPublic Pool API not reachable: ${(e as Error).message}`;

    await sendTelegramMessage(text);

    await addNotification({
      type: "miner",
      source: `miner:${BTC_ADDRESS}`,
      severity: "error",
      title: "Miner Monitor Error",
      message: text,
    });

    return NextResponse.json({ error: "monitor failed" }, { status: 500 });
  }
}
