import { authed, parseBody } from "@/lib/api/handler";
import { projectInputSchema } from "@/lib/schemas/projects";
import { createProject, listProjects } from "@/server/services/projects";

export const GET = authed(async () => listProjects());

export const POST = authed(async (req) => createProject(await parseBody(req, projectInputSchema)));
