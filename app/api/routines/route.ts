import { authed, parseBody } from "@/lib/api/handler";
import { routineInputSchema } from "@/lib/schemas/routines";
import { createRoutine, listRoutines } from "@/server/services/routines";

export const GET = authed(async () => listRoutines());

export const POST = authed(async (req) => createRoutine(await parseBody(req, routineInputSchema)));
