import { assertCronAuthorized } from "@/lib/api/cron";
import { open } from "@/lib/api/handler";
import { maybeSendDailySummary } from "@/server/scheduler";

export const POST = open(async (req) => {
  assertCronAuthorized(req);
  return maybeSendDailySummary(req.nextUrl.searchParams.get("force") === "1");
});
