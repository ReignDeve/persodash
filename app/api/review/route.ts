import { z } from "zod";

import { authed, parseQuery } from "@/lib/api/handler";
import { buildWeeklyReview } from "@/server/services/review";

const querySchema = z.object({ week: z.string().regex(/^\d{4}-W\d{2}$/).optional() });

export const GET = authed(async (req) => buildWeeklyReview(parseQuery(req, querySchema).week));
