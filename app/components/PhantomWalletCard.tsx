"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { WalletIcon } from "@heroicons/react/24/outline";
import { connectPhantomWallet } from "../services/phantomWalletService";

export default function PhantomWalletCard() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async (addr: string) => {
    const res = await fetch(`/api/solana/balance?address=${addr}`);
    if (!res.ok) {
      console.error("Balance API error", await res.text());
      return;
    }
    const data = await res.json();
    setBalance(data.sol);
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const pubKey = await connectPhantomWallet();
      if (!pubKey) return;

      setAddress(pubKey);
      await fetchBalance(pubKey);
    } finally {
      setLoading(false);
    }
  };

  const shortAddress = address && `${address.slice(0, 6)}…${address.slice(-6)}`;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <WalletIcon className="size-6" />
          <div className="flex flex-col items-start">
            <p className="text-sm font-semibold">Phantom Wallet</p>
            <p className="text-xs text-default-500">
              Connect Solana-Wallet to view balance
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="flat"
          onPress={handleConnect}
          isLoading={loading}
        >
          {address ? "Neu laden" : "Verbinden"}
        </Button>
      </CardHeader>

      <CardBody className="flex flex-col gap-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-default-500">
            <Spinner size="sm" /> Connecting to Phantom…
          </div>
        )}

        {!loading && !address && (
          <p className="text-sm text-default-500">
            Not connected yet. Click <b>Connect</b> to link your wallet.
          </p>
        )}

        {address && (
          <>
            <div>
              <p className="text-xs text-default-500 mb-1">Address</p>
              <p className="text-sm font-mono">{shortAddress}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-default-500">
                  Current SOL balance
                </span>
                <span className="text-lg font-semibold">
                  {balance !== null ? balance.toFixed(4) : "--"} SOL
                </span>
              </div>

              {balance !== null && (
                <Chip size="sm" variant="flat">
                  {balance.toFixed(4)} SOL
                </Chip>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
