import "server-only";

import { z } from "zod";

import { cached, fetchWithTimeout } from "@/server/cache";
import { upstreamError } from "@/lib/api/errors";

const BASE_URL = "https://api.vercel.com";
const TTL_MS = 60_000;

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  framework: z.string().nullish(),
  link: z
    .object({ type: z.string().optional(), org: z.string().optional(), repo: z.string().optional() })
    .nullish(),
});

const deploymentSchema = z.object({
  url: z.string().nullish(),
  createdAt: z.number().nullish(),
  readyState: z.string().nullish(),
  state: z.string().nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
});

const domainSchema = z.object({ name: z.string(), verified: z.boolean().optional() });

export type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  /** "owner/name" when the project is connected to a GitHub repository. */
  repo: string | null;
  domains: string[];
  deployment: z.infer<typeof deploymentSchema> | null;
};

type Credentials = { token: string; teamId?: string };

async function call<T>(creds: Credentials, path: string, schema: z.ZodType<T>, params: Record<string, string> = {}) {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (creds.teamId) url.searchParams.set("teamId", creds.teamId);

  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${creds.token}` } });
  if (!res.ok) {
    console.warn(`[vercel] ${path} → ${res.status}`);
    throw upstreamError("Vercel");
  }
  return schema.parse(await res.json());
}

export function fetchVercelProjects(creds: Credentials): Promise<VercelProject[]> {
  return cached(`vercel:${creds.teamId ?? "personal"}`, TTL_MS, async () => {
    const { projects } = await call(
      creds,
      "/v10/projects",
      z.object({ projects: z.array(projectSchema) }),
      { limit: "100" },
    );

    return Promise.all(
      projects.map(async (project) => {
        const [deployments, domains] = await Promise.all([
          call(creds, "/v6/deployments", z.object({ deployments: z.array(deploymentSchema) }), {
            projectId: project.id,
            target: "production",
            limit: "1",
          }).catch(() => ({ deployments: [] })),
          call(creds, `/v9/projects/${project.id}/domains`, z.object({ domains: z.array(domainSchema) })).catch(
            () => ({ domains: [] }),
          ),
        ]);

        return {
          id: project.id,
          name: project.name,
          framework: project.framework ?? null,
          repo:
            project.link?.type === "github" && project.link.org && project.link.repo
              ? `${project.link.org}/${project.link.repo}`
              : null,
          domains: domains.domains.map((d) => d.name),
          deployment: deployments.deployments[0] ?? null,
        };
      }),
    );
  });
}

const deploymentListSchema = z.object({
  deployments: z.array(z.object({ name: z.string(), created: z.number().optional(), createdAt: z.number().optional() })),
});

/** Production deployments created in [since, until] (ms timestamps), across all projects. */
export function fetchDeploymentsBetween(creds: Credentials, since: number, until: number) {
  return cached(`vercel:deployments:${since}:${until}`, 10 * 60_000, async () => {
    const { deployments } = await call(creds, "/v6/deployments", deploymentListSchema, {
      since: String(since),
      until: String(until),
      target: "production",
      limit: "100",
    });
    return deployments.map((d) => ({ project: d.name, createdAt: d.createdAt ?? d.created ?? 0 }));
  });
}
