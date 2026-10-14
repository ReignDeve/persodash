import { z } from "zod";

import type { DeploymentState, HealthState } from "@/lib/schemas/websites";

export const PROJECT_STATUSES = ["active", "paused", "idea", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  idea: "Idea",
  done: "Done",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name").max(80),
  description: optionalText(300),
  status: z.enum(PROJECT_STATUSES),
  repo: z
    .string()
    .trim()
    .max(140)
    .nullish()
    // Accept "owner/name" or a full GitHub URL.
    .transform((v) => (v ? v.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$|\/$/g, "") : null))
    .refine((v) => v === null || /^[\w.-]+\/[\w.-]+$/.test(v), "Use owner/name or a GitHub URL"),
  vercelProject: optionalText(100),
  url: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//.test(v), "Must start with http:// or https://"),
  nextStep: optionalText(200),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectFormValues = z.input<typeof projectInputSchema>;

/** Inline edits; fields that are absent stay untouched. */
export const projectPatchSchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  nextStep: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v || null)),
});

export type RepoActivity = {
  fullName: string;
  htmlUrl: string;
  pushedAt: string | null;
  defaultBranch: string;
  openPullRequests: number;
  openIssues: number;
  stars: number;
  commits: { sha: string; message: string; author: string | null; date: string; url: string }[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  repo: string | null;
  vercelProject: string | null;
  url: string | null;
  nextStep: string | null;
  updatedAt: string;
  github: RepoActivity | { error: string } | null;
  deployment: { state: DeploymentState; health: HealthState; createdAt: string | null } | null;
  monitors: { id: string; name: string; up: boolean | null }[];
  monthlyCostEur: number | null;
  /** Most recent sign of life across repo, deployment and record edits. */
  lastActivityAt: string;
};

export type ProjectsResponse = {
  projects: ProjectSummary[];
  github: { configured: boolean };
  /** Vercel projects not yet linked to a PersoDash project (for import). */
  importable: { name: string; repo: string | null; url: string | null }[];
};
