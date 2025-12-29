import { PublicPoolWorker } from "@/app/services/publicPoolService";

export type AlertSeverity = "warning" | "error";

export type AlertInfo = {
  worker: PublicPoolWorker;
  reasons: string[];
  severity: AlertSeverity;
};
