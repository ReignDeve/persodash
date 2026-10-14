import { z } from "zod";

export const WALLET_CHAINS = ["bitcoin", "solana"] as const;
export type WalletChain = (typeof WALLET_CHAINS)[number];

export const CHAIN_META: Record<WalletChain, { label: string; symbol: string; decimals: number }> = {
  bitcoin: { label: "Bitcoin", symbol: "BTC", decimals: 8 },
  solana: { label: "Solana", symbol: "SOL", decimals: 4 },
};

const BTC_ADDRESS = /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidAddress(chain: WalletChain, address: string) {
  return chain === "bitcoin" ? BTC_ADDRESS.test(address) : SOL_ADDRESS.test(address);
}

export const walletInputSchema = z
  .object({
    label: z.string().trim().min(1, "Give the wallet a name").max(60),
    chain: z.enum(WALLET_CHAINS),
    address: z.string().trim().min(1, "Enter an address"),
  })
  .superRefine((v, ctx) => {
    if (!isValidAddress(v.chain, v.address)) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: `Not a valid ${CHAIN_META[v.chain].label} address`,
      });
    }
  });

export type WalletInput = z.infer<typeof walletInputSchema>;

export const walletUpdateSchema = z.object({
  label: z.string().trim().min(1, "Give the wallet a name").max(60),
});

export type TokenHolding = { symbol: string; name: string; amount: number; valueEur: number | null };

export type WalletBalance = {
  id: string;
  label: string;
  chain: WalletChain;
  address: string;
  /** true for the mining address from BTC_ADDRESS – not stored in the DB, not editable. */
  managedByEnv: boolean;
  amount: number | null;
  valueEur: number | null;
  tokens: TokenHolding[];
  error: string | null;
};

export type ExchangeAccount = {
  id: string;
  name: string;
  currency: string;
  currencyName: string;
  amount: number;
  valueEur: number | null;
  primary: boolean;
};

export type ExchangeOverview =
  | { status: "ok"; accounts: ExchangeAccount[]; valueEur: number | null }
  | { status: "not_configured" | "error"; message: string };

export type WalletsResponse = {
  wallets: WalletBalance[];
  exchange: ExchangeOverview;
  prices: { btcEur: number | null; solEur: number | null };
  totalEur: number | null;
  fetchedAt: string;
};
