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

export async function fetchWorkers(
  address: string
): Promise<PublicPoolWorker[]> {
  const res = await fetch(
    `https://public-pool.io:40557/api/client/${address}`,
    {
      cache: "no-store",
    }
  );

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
    // only logging, do not crash further
    console.error("Failed to create miner notification", e);
  }
}

/**
 * Wrapper: fetches workers + triggers notifications if needed.
 * Use this function in the UI if you want alerts.
 */
export async function fetchWorkersWithAlerts(
  address: string
): Promise<PublicPoolWorker[]> {
  try {
    const workers = await fetchWorkers(address);

    // Example rule: Worker offline since >10 minutes OR Hashrate 0
    const now = Date.now();
    const inactive = workers.filter((w) => {
      const lastSeen = new Date(w.lastSeen).getTime();
      const minutesSince = (now - lastSeen) / 1000 / 60;
      return minutesSince > 10 || w.hashRate <= 400000.0;
    });

    for (const w of inactive) {
      await createMinerNotification({
        address,
        workerId: w.sessionId,
        title: "Miner-Worker inactive",
        message: `Worker ${w.sessionId} inactive since ${new Date(w.lastSeen)}.`,
        severity: "warning",
      });
    }

    return workers;
  } catch (error) {
    // network/API error → system notification
    // only log once per error occurrence
    await createMinerNotification({
      address,
      title: "Error while fetching miner data",
      message: `Public Pool API not reachable or returned invalid data: ${(error as Error).message}`,
      severity: "error",
    });
    throw error;
  }
}
