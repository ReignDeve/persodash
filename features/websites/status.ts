import type { Tone } from "@/components/ui/status";
import type { DeploymentState, Website } from "@/lib/schemas/websites";

const DEPLOY_TONE: Record<DeploymentState, { tone: Tone; label: string }> = {
  ready: { tone: "ok", label: "Ready" },
  building: { tone: "warn", label: "Building" },
  error: { tone: "err", label: "Failed" },
  canceled: { tone: "idle", label: "Canceled" },
  unknown: { tone: "idle", label: "Unknown" },
};

/** One combined state: reachability wins over build status. */
export function siteStatus(w: Website): { tone: Tone; label: string } {
  if (w.health.state === "down") return { tone: "err", label: "Down" };
  if (w.deployment.state === "error") return { tone: "err", label: "Failed" };
  if (w.deployment.state === "building") return { tone: "warn", label: "Building" };
  if (w.health.state === "up") return { tone: "ok", label: "Online" };
  return DEPLOY_TONE[w.deployment.state];
}
