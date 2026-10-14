import { authed, parseBody } from "@/lib/api/handler";
import { subscriptionInputSchema } from "@/lib/schemas/subscriptions";
import { deleteSubscription, updateSubscription } from "@/server/services/subscriptions";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) =>
  updateSubscription(params.id, await parseBody(req, subscriptionInputSchema)),
);

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteSubscription(params.id);
});
