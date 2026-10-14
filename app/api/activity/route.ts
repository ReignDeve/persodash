import { authed } from "@/lib/api/handler";
import { getActivity } from "@/server/services/activity";

export const GET = authed(async () => ({ items: await getActivity() }));
