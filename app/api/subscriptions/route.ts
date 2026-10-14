import { authed, parseBody } from "@/lib/api/handler";
import { subscriptionInputSchema } from "@/lib/schemas/subscriptions";
import { createSubscription, listSubscriptions } from "@/server/services/subscriptions";

export const GET = authed(async () => listSubscriptions());

export const POST = authed(async (req) => createSubscription(await parseBody(req, subscriptionInputSchema)));
