import { z } from "zod";

import { authed, parseBody } from "@/lib/api/handler";
import { promoteNote } from "@/server/services/notes";

const bodySchema = z.object({ projectId: z.string().min(1).optional() });

/** Makes the note the next step of a project and archives it. */
export const POST = authed<{ id: string }>(async (req, { params }) => {
  const { projectId } = await parseBody(req, bodySchema);
  return promoteNote(params.id, projectId);
});
