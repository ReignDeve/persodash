import { parseBody } from "@/lib/api/handler";
import { withToken } from "@/lib/api/token-auth";
import { automationTripSchema } from "@/lib/schemas/automation";
import { logTripFromAutomation } from "@/server/services/automation";

/** Log a trip: { "description": "Arbeit" } – distance/type default to the last trip of that name. */
export const POST = withToken("trips", async (req) => {
  const { trip, message } = await logTripFromAutomation(await parseBody(req, automationTripSchema));
  return { ok: true, trip, message };
});
