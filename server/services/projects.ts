import "server-only";

import { db } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import type { ProjectInput, ProjectSummary, ProjectsResponse } from "@/lib/schemas/projects";
import { CYCLE_MONTHS } from "@/lib/schemas/subscriptions";
import { fetchRepoActivity, isGithubConfigured } from "@/server/integrations/github";
import { fetchPricesSafe } from "@/server/integrations/prices";
import { getWebsites } from "@/server/services/websites";

const STATUS_ORDER = { active: 0, paused: 1, idea: 2, done: 3 } as const;

/**
 * Projects are the hub of PersoDash: a project links a GitHub repo, a Vercel
 * deployment, service monitors and subscriptions, and shows them together.
 */
export async function listProjects(): Promise<ProjectsResponse> {
  const [projects, websites, latestChecks, prices] = await Promise.all([
    db.project.findMany({
      include: {
        monitors: { select: { id: true, name: true, enabled: true } },
        subscriptions: { where: { active: true }, select: { amountCents: true, currency: true, cycle: true } },
      },
    }),
    getWebsites(),
    // Latest check per monitor.
    db.monitorCheck.findMany({
      distinct: ["monitorId"],
      orderBy: [{ monitorId: "asc" }, { checkedAt: "desc" }],
      select: { monitorId: true, ok: true },
    }),
    fetchPricesSafe(),
  ]);

  const sites = websites.status === "ok" ? websites.websites : [];
  const lastOk = new Map(latestChecks.map((c) => [c.monitorId, c.ok]));

  const summaries = await Promise.all(
    projects.map(async (p): Promise<ProjectSummary> => {
      const github = p.repo
        ? await fetchRepoActivity(p.repo).catch((error: unknown) => ({
            error: error instanceof ApiError ? error.message : "GitHub unavailable",
          }))
        : null;

      const site = p.vercelProject ? sites.find((s) => s.name === p.vercelProject) : undefined;

      const costs = p.subscriptions.map((s) => {
        const amount = s.amountCents / 100;
        const eur = s.currency === "EUR" ? amount : prices.usdToEur ? amount * prices.usdToEur : null;
        return eur === null ? null : eur / CYCLE_MONTHS[s.cycle];
      });

      // Real work signals first; the record's own edit time is only a fallback.
      const signals = [
        github && "pushedAt" in github ? github.pushedAt : null,
        site?.deployment.createdAt ?? null,
      ].filter((v): v is string => Boolean(v));
      const activity = signals.length ? signals : [p.updatedAt.toISOString()];

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        repo: p.repo,
        vercelProject: p.vercelProject,
        url: p.url ?? site?.primaryUrl ?? null,
        nextStep: p.nextStep,
        updatedAt: p.updatedAt.toISOString(),
        github,
        deployment: site
          ? { state: site.deployment.state, health: site.health.state, createdAt: site.deployment.createdAt }
          : null,
        monitors: p.monitors.map((m) => ({
          id: m.id,
          name: m.name,
          up: m.enabled ? (lastOk.get(m.id) ?? null) : null,
        })),
        monthlyCostEur: costs.length ? costs.reduce<number>((sum, c) => sum + (c ?? 0), 0) : null,
        lastActivityAt: activity.sort().at(-1)!,
      };
    }),
  );

  summaries.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.lastActivityAt.localeCompare(a.lastActivityAt),
  );

  const linked = new Set(projects.map((p) => p.vercelProject).filter(Boolean));
  return {
    projects: summaries,
    github: { configured: isGithubConfigured() },
    importable: sites
      .filter((s) => !linked.has(s.name))
      .map((s) => ({ name: s.name, repo: s.repo, url: s.primaryUrl })),
  };
}

export function createProject(input: ProjectInput) {
  return db.project.create({ data: input });
}

export function updateProject(id: string, data: Partial<ProjectInput>) {
  return db.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } });
}

/** Creates projects for the selected Vercel projects, linking repo and URL. */
export async function importFromVercel(names: string[]) {
  const websites = await getWebsites();
  if (websites.status !== "ok") throw new ApiError(502, "Vercel is not available", "upstream");

  const existing = new Set((await db.project.findMany({ select: { vercelProject: true } })).map((p) => p.vercelProject));
  const toCreate = websites.websites.filter((w) => names.includes(w.name) && !existing.has(w.name));

  await db.project.createMany({
    data: toCreate.map((w) => ({
      name: w.name,
      status: "active" as const,
      repo: w.repo,
      vercelProject: w.name,
      url: w.primaryUrl,
    })),
  });
  return { created: toCreate.length };
}

export function listProjectOptions() {
  return db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}
