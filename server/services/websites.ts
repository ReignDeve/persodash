import "server-only";

import { env } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import type { DeploymentState, Website, WebsitesResponse } from "@/lib/schemas/websites";
import { cached, fetchWithTimeout } from "@/server/cache";
import { fetchVercelProjects } from "@/server/integrations/vercel";

const HEALTH_TTL_MS = 60_000;
const HEALTH_TIMEOUT_MS = 6000;
const HEALTH_ATTEMPTS = 2;

function deploymentState(readyState?: string | null): DeploymentState {
  switch (readyState) {
    case "READY":
      return "ready";
    case "ERROR":
      return "error";
    case "CANCELED":
      return "canceled";
    case "BUILDING":
    case "QUEUED":
    case "INITIALIZING":
      return "building";
    default:
      return "unknown";
  }
}

async function probe(url: string): Promise<Website["health"]> {
  const started = performance.now();
  const res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow", timeoutMs: HEALTH_TIMEOUT_MS });
  return {
    state: res.status < 500 ? "up" : "down",
    statusCode: res.status,
    latencyMs: Math.round(performance.now() - started),
  };
}

/**
 * Real reachability check of the public URL – a READY deployment can still be
 * down. A single failed request is retried once so a transient network blip
 * does not raise a false "down".
 */
function checkHealth(url: string): Promise<Website["health"]> {
  return cached(`health:${url}`, HEALTH_TTL_MS, async () => {
    for (let attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++) {
      try {
        const result = await probe(url);
        if (result.state === "up" || attempt === HEALTH_ATTEMPTS) return result;
      } catch (error) {
        if (attempt === HEALTH_ATTEMPTS) {
          console.warn(`[health] ${url} unreachable: ${(error as Error).message}`);
        }
      }
    }
    return { state: "down", statusCode: null, latencyMs: null };
  });
}

function stringMeta(meta: Record<string, unknown> | null | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function getWebsites(): Promise<WebsitesResponse> {
  const { VERCEL_API_TOKEN, VERCEL_TEAM_ID } = env();
  if (!VERCEL_API_TOKEN) {
    return { status: "not_configured", message: "Set VERCEL_API_TOKEN to monitor your projects." };
  }

  try {
    const projects = await fetchVercelProjects({ token: VERCEL_API_TOKEN, teamId: VERCEL_TEAM_ID });

    const websites = await Promise.all(
      projects.map(async (p): Promise<Website> => {
        // Prefer a custom domain over the generated *.vercel.app one.
        const domains = [...p.domains].sort(
          (a, b) => Number(a.endsWith(".vercel.app")) - Number(b.endsWith(".vercel.app")),
        );
        const deploymentUrl = p.deployment?.url ? `https://${p.deployment.url}` : null;
        const primaryUrl = domains[0] ? `https://${domains[0]}` : deploymentUrl;
        const meta = p.deployment?.meta;

        return {
          id: p.id,
          name: p.name,
          framework: p.framework,
          repo: p.repo,
          domains,
          primaryUrl,
          deployment: {
            state: deploymentState(p.deployment?.readyState ?? p.deployment?.state),
            url: deploymentUrl,
            createdAt: p.deployment?.createdAt ? new Date(p.deployment.createdAt).toISOString() : null,
            commitMessage: stringMeta(meta, "githubCommitMessage") ?? stringMeta(meta, "gitlabCommitMessage"),
            branch: stringMeta(meta, "githubCommitRef") ?? stringMeta(meta, "gitlabCommitRef"),
          },
          health: primaryUrl
            ? await checkHealth(primaryUrl)
            : { state: "unknown", statusCode: null, latencyMs: null },
        };
      }),
    );

    websites.sort((a, b) => (b.deployment.createdAt ?? "").localeCompare(a.deployment.createdAt ?? ""));
    return { status: "ok", websites, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "Vercel returned unexpected data.",
    };
  }
}
