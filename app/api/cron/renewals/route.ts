import { assertCronAuthorized } from "@/lib/api/cron";
import { open } from "@/lib/api/handler";
import { runRenewalReminders } from "@/server/services/subscriptions";

export const POST = open(async (req) => {
  assertCronAuthorized(req);
  return runRenewalReminders();
});
