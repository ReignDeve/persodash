import { assertCronAuthorized } from "@/lib/api/cron";
import { open } from "@/lib/api/handler";
import { runMonitors } from "@/server/services/services";

export const POST = open(async (req) => {
  assertCronAuthorized(req);
  return runMonitors();
});
