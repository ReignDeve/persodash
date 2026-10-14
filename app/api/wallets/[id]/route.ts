import { authed, parseBody } from "@/lib/api/handler";
import { walletUpdateSchema } from "@/lib/schemas/wallets";
import { deleteWallet, renameWallet } from "@/server/services/wallets";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => {
  const { label } = await parseBody(req, walletUpdateSchema);
  return renameWallet(params.id, label);
});

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteWallet(params.id);
});
