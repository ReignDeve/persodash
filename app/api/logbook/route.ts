import { authed, parseBody, parseQuery } from "@/lib/api/handler";
import { tripFilterSchema, tripInputSchema } from "@/lib/schemas/logbook";
import { createTrip, getLogbookSummary, listTrips } from "@/server/services/logbook";

export const GET = authed(async (req) => {
  const filter = parseQuery(req, tripFilterSchema);
  const [trips, summary] = await Promise.all([listTrips(filter), getLogbookSummary()]);
  return { trips, summary };
});

export const POST = authed(async (req) => {
  return createTrip(await parseBody(req, tripInputSchema));
});
