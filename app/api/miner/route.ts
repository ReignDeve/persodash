import { authed } from "@/lib/api/handler";
import { getMinerOverview } from "@/server/services/miner";

export const GET = authed(async () => getMinerOverview());
