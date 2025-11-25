"use client";

import React from "react";
import PhantomWalletCard from "../../components/PhantomWalletCard";
import BtcWalletCard from "../../components/btcWalletCard";
import CoinbaseCard from "../../components/coinbaseCard";

const BTC_ADDRESS = "bc1qt20zwyvgysgtkl2j66mslnut7nxqpzhjhxkqxl";

export default function WalletsPage() {
  return (
    <div className="flex flex-row gap-6 w-full">
      {/* Erste Wallet: Phantom */}
      <PhantomWalletCard />
      <BtcWalletCard
          address={BTC_ADDRESS}
          title="BTC Mining Wallet"
        />
<CoinbaseCard />
      {/* Platzhalter für weitere Wallet-Typen */}
      {/* <ExchangeWalletCard /> */}
      {/* <BankAccountCard /> */}
    </div>
  );
}
