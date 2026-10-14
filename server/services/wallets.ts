import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, badRequest } from "@/lib/api/errors";
import type {
  ExchangeOverview,
  WalletBalance,
  WalletInput,
  WalletsResponse,
} from "@/lib/schemas/wallets";
import { fetchCoinbaseAccounts } from "@/server/integrations/coinbase";
import { fetchBtcBalance, fetchSolBalance, fetchSplTokens } from "@/server/integrations/chains";
import { fetchPricesSafe, type PriceTable } from "@/server/integrations/prices";

/** Id of the read-only wallet derived from BTC_ADDRESS. */
export const ENV_WALLET_ID = "env-mining";

type WalletRef = Pick<WalletBalance, "id" | "label" | "chain" | "address" | "managedByEnv">;

export async function listWalletRefs(): Promise<WalletRef[]> {
  const { BTC_ADDRESS } = env();
  const stored = await db.wallet.findMany({ orderBy: { createdAt: "asc" } });
  const refs: WalletRef[] = stored.map((w) => ({
    id: w.id,
    label: w.label,
    chain: w.chain,
    address: w.address,
    managedByEnv: false,
  }));

  if (BTC_ADDRESS && !refs.some((w) => w.chain === "bitcoin" && w.address === BTC_ADDRESS)) {
    refs.unshift({
      id: ENV_WALLET_ID,
      label: "Mining payout",
      chain: "bitcoin",
      address: BTC_ADDRESS,
      managedByEnv: true,
    });
  }
  return refs;
}

async function withBalance(ref: WalletRef, prices: PriceTable): Promise<WalletBalance> {
  const { SOLANA_RPC_URL, MORALIS_API_KEY } = env();
  const base = { ...ref, amount: null, valueEur: null, tokens: [], error: null };

  try {
    if (ref.chain === "bitcoin") {
      const amount = await fetchBtcBalance(ref.address);
      const price = prices.eur.BTC;
      return { ...base, amount, valueEur: price ? amount * price : null };
    }

    const [amount, spl] = await Promise.all([
      fetchSolBalance(SOLANA_RPC_URL, ref.address),
      MORALIS_API_KEY ? fetchSplTokens(MORALIS_API_KEY, ref.address).catch(() => []) : Promise.resolve([]),
    ]);
    const tokens = spl.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      amount: t.amount,
      valueEur:
        prices.eur[t.symbol.toUpperCase()] !== undefined
          ? t.amount * prices.eur[t.symbol.toUpperCase()]
          : t.valueUsd !== null && prices.usdToEur
            ? t.valueUsd * prices.usdToEur
            : null,
    }));
    const solValue = prices.eur.SOL ? amount * prices.eur.SOL : null;
    const tokenValue = tokens.reduce((sum, t) => sum + (t.valueEur ?? 0), 0);
    return {
      ...base,
      amount,
      tokens,
      valueEur: solValue === null ? null : solValue + tokenValue,
    };
  } catch (error) {
    return { ...base, error: error instanceof ApiError ? error.message : "Balance unavailable" };
  }
}

async function getExchange(prices: PriceTable): Promise<ExchangeOverview> {
  const { COINBASE_API_KEY_ID, COINBASE_API_KEY_SECRET } = env();
  if (!COINBASE_API_KEY_ID || !COINBASE_API_KEY_SECRET) {
    return { status: "not_configured", message: "Add Coinbase API keys to include exchange balances." };
  }
  try {
    const raw = await fetchCoinbaseAccounts(COINBASE_API_KEY_ID, COINBASE_API_KEY_SECRET);
    const accounts = raw
      .map((a) => {
        const amount = Number(a.balance.amount) || 0;
        const price = prices.eur[a.balance.currency.toUpperCase()];
        return {
          id: a.id,
          name: a.name ?? a.currency.code,
          currency: a.balance.currency,
          currencyName: a.currency.name ?? a.currency.code,
          amount,
          valueEur: price !== undefined ? amount * price : null,
          primary: a.primary,
        };
      })
      .filter((a) => a.amount > 0)
      .sort((a, b) => (b.valueEur ?? 0) - (a.valueEur ?? 0));

    const valued = accounts.filter((a) => a.valueEur !== null);
    return {
      status: "ok",
      accounts,
      valueEur: valued.length ? valued.reduce((s, a) => s + (a.valueEur ?? 0), 0) : null,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "Coinbase returned unexpected data.",
    };
  }
}

export async function getWalletsOverview(): Promise<WalletsResponse> {
  const prices = await fetchPricesSafe();
  const [refs, exchange] = await Promise.all([listWalletRefs(), getExchange(prices)]);
  const wallets = await Promise.all(refs.map((r) => withBalance(r, prices)));

  const parts = [
    ...wallets.map((w) => w.valueEur),
    exchange.status === "ok" ? exchange.valueEur : null,
  ].filter((v): v is number => v !== null);

  return {
    wallets,
    exchange,
    prices: { btcEur: prices.eur.BTC ?? null, solEur: prices.eur.SOL ?? null },
    totalEur: parts.length ? parts.reduce((a, b) => a + b, 0) : null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function createWallet(input: WalletInput) {
  return db.wallet.create({ data: input });
}

export async function renameWallet(id: string, label: string) {
  if (id === ENV_WALLET_ID) throw badRequest("This wallet is configured via BTC_ADDRESS.");
  return db.wallet.update({ where: { id }, data: { label } });
}

export async function deleteWallet(id: string) {
  if (id === ENV_WALLET_ID) throw badRequest("This wallet is configured via BTC_ADDRESS.");
  await db.wallet.delete({ where: { id } });
}
