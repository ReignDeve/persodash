export type DeploymentState = "ready" | "error" | "building" | "canceled" | "unknown";
export type HealthState = "up" | "down" | "unknown";

export type Website = {
  id: string;
  name: string;
  framework: string | null;
  repo: string | null;
  domains: string[];
  primaryUrl: string | null;
  deployment: {
    state: DeploymentState;
    url: string | null;
    createdAt: string | null;
    commitMessage: string | null;
    branch: string | null;
  };
  health: { state: HealthState; statusCode: number | null; latencyMs: number | null };
};

export type WebsitesResponse =
  | { status: "ok"; websites: Website[]; fetchedAt: string }
  | { status: "not_configured" | "error"; message: string };
