export type CoinbaseMoney = {
  amount: string;
  currency: string;
};

export type CoinbaseCurrency = {
  code: string;          // z.B. "BTC"
  name: string;          // z.B. "Bitcoin"
  type: string;          // "crypto" | "fiat" | ...
  exponent?: number;
  color?: string;
  slug?: string;
};

export type CoinbaseAccount = {
  id: string;
  name: string;
  primary: boolean;
  type: "wallet" | "fiat" | "vault" | string;
  currency: CoinbaseCurrency;
  balance: CoinbaseMoney;
  created_at: string;
  updated_at: string;
  resource: string;
  resource_path: string;
};

export type CoinbaseAccountsResponse = {
  data: CoinbaseAccount[];
};
