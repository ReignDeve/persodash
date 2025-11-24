// types/publicPool.ts
export interface PublicPoolWorker {
  sessionId: string;
  name: string;
  hashRate: number;
  bestDifficulty: number;
  startTime: string;
  lastSeen: string;
}

export interface PublicPoolClientResponse {
  bestDifficulty: number;
  workersCount: number;
  workers: PublicPoolWorker[];
}

export interface PublicPoolStatsResponse {
  totalHashRate: number;     // z.B. in PH/s
  blockHeight: number;
  totalMiners: number;
  blocksFound: number;
  // ggf. weitere Felder
}
