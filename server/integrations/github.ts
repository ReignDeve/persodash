import "server-only";

import { z } from "zod";

import { env } from "@/lib/env";
import { notFound, upstreamError } from "@/lib/api/errors";
import type { RepoActivity } from "@/lib/schemas/projects";
import { cached, fetchWithTimeout } from "@/server/cache";

const BASE_URL = "https://api.github.com";
// Without a token GitHub allows 60 requests/hour – the cache keeps us well below.
const TTL_MS = 5 * 60_000;
const COMMITS_SHOWN = 5;

const repoSchema = z.object({
  full_name: z.string(),
  html_url: z.string(),
  pushed_at: z.string().nullable(),
  default_branch: z.string(),
  open_issues_count: z.number(),
  stargazers_count: z.number(),
});

const commitSchema = z.object({
  sha: z.string(),
  html_url: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({ name: z.string().nullish(), date: z.string() }).nullish(),
  }),
});

async function call<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const token = env().GITHUB_TOKEN;
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) throw notFound(token ? "Repository not found" : "Private repo – add GITHUB_TOKEN");
  if (!res.ok) {
    console.warn(`[github] ${path} → ${res.status}`);
    throw upstreamError("GitHub");
  }
  return schema.parse(await res.json());
}

export function isGithubConfigured() {
  return Boolean(env().GITHUB_TOKEN);
}

/**
 * Failures are cached too (as values): without a token GitHub allows only 60
 * requests/hour, and a private repo would otherwise be retried on every load.
 */
export async function fetchRepoActivity(repo: string): Promise<RepoActivity> {
  const result = await cached(`github:${repo}`, TTL_MS, () =>
    loadRepoActivity(repo).then(
      (data) => ({ data }) as const,
      (error: unknown) => ({ error }) as const,
    ),
  );
  if ("error" in result) throw result.error;
  return result.data;
}

async function loadRepoActivity(repo: string): Promise<RepoActivity> {
  // Repo first: if it is inaccessible, skip the two follow-up requests.
  const info = await call(`/repos/${repo}`, repoSchema);
  const [pulls, commits] = await Promise.all([
    call(`/repos/${repo}/pulls?state=open&per_page=50`, z.array(z.object({ id: z.number() }))),
    call(`/repos/${repo}/commits?per_page=${COMMITS_SHOWN}`, z.array(commitSchema)).catch(() => []),
  ]);

  return {
    fullName: info.full_name,
    htmlUrl: info.html_url,
    pushedAt: info.pushed_at,
    defaultBranch: info.default_branch,
    openPullRequests: pulls.length,
    // GitHub counts PRs as issues.
    openIssues: Math.max(0, info.open_issues_count - pulls.length),
    stars: info.stargazers_count,
    commits: commits.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name ?? null,
      date: c.commit.author?.date ?? "",
      url: c.html_url,
    })),
  };
}

const COMMITS_PAGE = 100;

/** Number of commits on the default branch in [since, until] (capped at 100 – "100+" is plenty). */
export function fetchCommitCount(repo: string, since: string, until: string): Promise<number> {
  return cached(`github:commits:${repo}:${since}:${until}`, 30 * 60_000, async () => {
    const commits = await call(
      `/repos/${repo}/commits?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&per_page=${COMMITS_PAGE}`,
      z.array(z.object({ sha: z.string() })),
    );
    return commits.length;
  });
}
