export type MinerWorker = {
  sessionId: string;
  name: string;
  hashrate: number; // H/s
  bestDifficulty: number;
  startedAt: string;
  lastSeenAt: string;
  online: boolean;
  belowThreshold: boolean;
  isMine: boolean;
};

export type HashratePoint = { t: string; hashrate: number };

export type MinerResponse =
  | {
      status: "ok";
      address: string;
      workers: MinerWorker[];
      totalHashrate: number;
      bestDifficulty: number;
      onlineCount: number;
      /** From our own periodic snapshots, oldest first. */
      history: HashratePoint[];
      thresholds: { minHashrate: number; inactiveMinutes: number };
      fetchedAt: string;
    }
  | { status: "not_configured" | "error"; message: string };
