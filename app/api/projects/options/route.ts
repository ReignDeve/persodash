import { authed } from "@/lib/api/handler";
import { listProjectOptions } from "@/server/services/projects";

/** Lightweight id/name list for "belongs to project" pickers. */
export const GET = authed(async () => ({ projects: await listProjectOptions() }));
