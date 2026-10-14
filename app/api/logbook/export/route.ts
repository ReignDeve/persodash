import { authed, parseQuery } from "@/lib/api/handler";
import { tripFilterSchema } from "@/lib/schemas/logbook";
import { listTrips, tripsToCsv } from "@/server/services/logbook";

export const GET = authed(async (req) => {
  const filter = parseQuery(req, tripFilterSchema);
  const csv = tripsToCsv(await listTrips(filter));
  const name = `logbook-${filter.year ?? "all"}.csv`;
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
});
