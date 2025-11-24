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
