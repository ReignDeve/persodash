import { assertCronAuthorized } from "@/lib/api/cron";
import { open } from "@/lib/api/handler";
import { runMinerMonitor } from "@/server/services/miner";

export const POST = open(async (req) => {
  assertCronAuthorized(req);
  return runMinerMonitor();
});
