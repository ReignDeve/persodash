"use client";

import PhantomWalletCard from "../../components/PhantomWalletCard";
import BtcWalletCard from "../../components/btcWalletCard";
import CoinbaseCard from "../../components/coinbaseCard";

const BTC_ADDRESS = process.env.BTC_ADDRESS || "";

export default function WalletsPage() {
  return (
    <div className="flex flex-row gap-6 w-full">
      <PhantomWalletCard />
      <BtcWalletCard address={BTC_ADDRESS} title="BTC Mining Wallet" />
      <CoinbaseCard />
      {/* TODO */}
      {/* Add the option to add and save wallets directly in the dashboard. */}
    </div>
  );
}
