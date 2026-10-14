import { z } from "zod";

import { parseBody } from "@/lib/api/handler";
import { withToken } from "@/lib/api/token-auth";
import { completeRoutineByTitle } from "@/server/services/routines";

const bodySchema = z.object({ title: z.string().trim().min(1).max(120) });

/** Mark a routine as done by (part of) its title: { "title": "backups" } */
export const POST = withToken("routines", async (req) => {
  const { title } = await parseBody(req, bodySchema);
  const result = await completeRoutineByTitle(title);
  return { ok: true, ...result, message: `Done: ${result.title} – next on ${result.nextDue}` };
});
