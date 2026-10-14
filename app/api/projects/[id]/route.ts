import { z } from "zod";

import { authed, parseBody } from "@/lib/api/handler";
import { projectInputSchema, projectPatchSchema } from "@/lib/schemas/projects";
import { deleteProject, updateProject } from "@/server/services/projects";

type Params = { id: string };

/** Full edit (with `name`) or quick inline patch of status / next step. */
export const PATCH = authed<Params>(async (req, { params }) => {
  const body = await parseBody(req, z.unknown());
  const isFullEdit = typeof body === "object" && body !== null && "name" in body;
  const data = isFullEdit ? projectInputSchema.parse(body) : projectPatchSchema.parse(body);
  return updateProject(params.id, data);
});

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteProject(params.id);
});
