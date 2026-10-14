import { authed, parseBody } from "@/lib/api/handler";
import { routineActionSchema } from "@/lib/schemas/routines";
import { actOnRoutine } from "@/server/services/routines";

/** { action: "done" | "skip" | "snooze", days? } */
export const POST = authed<{ id: string }>(async (req, { params }) =>
  actOnRoutine(params.id, await parseBody(req, routineActionSchema)),
);
