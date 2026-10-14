import type { Tone } from "@/components/ui/status";
import type { MinerWorker } from "@/lib/schemas/miner";

export function workerStatus(w: MinerWorker): { tone: Tone; label: string } {
  if (!w.online) return { tone: "err", label: "Offline" };
  if (w.belowThreshold) return { tone: "warn", label: "Low" };
  return { tone: "ok", label: "Online" };
}
