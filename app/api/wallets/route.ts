import { authed, parseBody } from "@/lib/api/handler";
import { walletInputSchema } from "@/lib/schemas/wallets";
import { createWallet, getWalletsOverview } from "@/server/services/wallets";

export const GET = authed(async () => getWalletsOverview());

export const POST = authed(async (req) => createWallet(await parseBody(req, walletInputSchema)));
