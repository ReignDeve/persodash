import "server-only";

import { z } from "zod";

import { cached, fetchWithTimeout } from "@/server/cache";
import { upstreamError } from "@/lib/api/errors";

const BASE_URL = "https://public-pool.io:40557/api";
const TTL_MS = 30_000;

const workerSchema = z.object({
  sessionId: z.string(),
  name: z.string().default(""),
  hashRate: z.coerce.number().catch(0),
  bestDifficulty: z.coerce.number().catch(0),
  startTime: z.string(),
  lastSeen: z.string(),
});

const clientSchema = z.object({
  bestDifficulty: z.coerce.number().catch(0),
  workers: z.array(workerSchema).default([]),
});

export type PoolWorker = z.infer<typeof workerSchema>;
export type PoolClient = z.infer<typeof clientSchema>;

export function fetchPoolClient(address: string): Promise<PoolClient> {
  return cached(`public-pool:${address}`, TTL_MS, async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/client/${encodeURIComponent(address)}`);
    if (!res.ok) throw upstreamError("Public Pool");
    return clientSchema.parse(await res.json());
  });
}
