// services/publicPoolService.ts

export interface PublicPoolWorker {
  sessionId: string;
  name: string;
  hashRate: number;
  bestDifficulty: number;
  startTime: string;
  lastSeen: string;
}

const normalize = (data: any): PublicPoolWorker[] => {
  return (data.workers ?? []).map((w: any) => ({
    sessionId: w.sessionId,
    name: w.name,
    hashRate: Number(w.hashRate) || 0,
    bestDifficulty: Number(w.bestDifficulty) || 0,
    startTime: w.startTime,
    lastSeen: w.lastSeen,
  }));
};

export async function fetchWorkers(address: string): Promise<PublicPoolWorker[]> {
  const res = await fetch(`https://public-pool.io:40557/api/client/${address}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch worker data from Public Pool");
  }

  const raw = await res.json();
  return normalize(raw);
}

async function createMinerNotification(opts: {
  address: string;
  workerId?: string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "error";
}) {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "miner",
        source: opts.workerId
          ? `miner:${opts.address}:${opts.workerId}`
          : `miner:${opts.address}`,
        severity: opts.severity ?? "warning",
        title: opts.title,
        message: opts.message,
      }),
    });
  } catch (e) {
    // im Zweifel nur loggen, nicht noch mehr crashen
    console.error("Failed to create miner notification", e);
  }
}

/**
 * Wrapper: holt Worker + löst ggf. Notifications aus.
 * Verwende diese Funktion in der UI, wenn du Alerts willst.
 */
export async function fetchWorkersWithAlerts(
  address: string
): Promise<PublicPoolWorker[]> {
  try {
    const workers = await fetchWorkers(address);

    // Beispiel-Regel: Worker seit >10 Minuten nicht gesehen ODER Hashrate 0
    const now = Date.now();
    const inactive = workers.filter((w) => {
      const lastSeen = new Date(w.lastSeen).getTime();
      const minutesSince = (now - lastSeen) / 1000 / 60;
      return minutesSince > 10 || w.hashRate <= 900000.00;
    });

    for (const w of inactive) {
      await createMinerNotification({
        address,
        workerId: w.sessionId,
        title: "Miner-Worker inaktiv",
        message: `Worker ${w.sessionId} ist seit mehr als 10 Minuten inaktiv oder hat 0 H/s.`,
        severity: "warning",
      });
    }

    return workers;
  } catch (error) {
    // Netz-/API-Fehler → System-Notification
    await createMinerNotification({
      address,
      title: "Fehler beim Laden der Miner-Daten",
      message: `Public Pool API konnte nicht erreicht werden: ${(error as Error).message}`,
      severity: "error",
    });
    throw error;
  }
}