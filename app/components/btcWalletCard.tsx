"use client";

import React, { useCallback, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { BanknotesIcon } from "@heroicons/react/24/outline";

type BtcBalanceResponse = {
  address: string;
  sats: number;
  btc: number;
};

interface BtcWalletCardProps {
  address: string;
  title?: string;
}

export default function BtcWalletCard({
  address,
  title = "BTC Wallet",
}: BtcWalletCardProps) {
  const [balance, setBalance] = useState<BtcBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortAddress = address && `${address.slice(0, 6)}…${address.slice(-6)}`;

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/btc/balance?address=${address}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("BTC balance API error:", text);
        setError("Konnte BTC-Balance nicht laden.");
        return;
      }
      const data: BtcBalanceResponse = await res.json();
      setBalance(data);
    } catch (e) {
      console.error(e);
      setError("Konnte BTC-Balance nicht laden.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BanknotesIcon className="size-6" />
          <div className="flex flex-col items-start">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-default-500">
              On-Chain BTC balance of your address
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="flat"
          onPress={loadBalance}
          isLoading={loading}
        >
          Refresh
        </Button>
      </CardHeader>

      <CardBody className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-default-500 mb-1">Address</p>
          <p className="text-sm font-mono">{shortAddress}</p>
        </div>

        {error && <p className="text-xs text-danger-500">{error}</p>}

        {!error && (
          <>
            <div className="flex flex-col">
              <span className="text-xs text-default-500">BTC-Balance</span>
              <span className="text-xl font-semibold">
                {balance ? balance.btc.toFixed(8) : "--"} BTC
              </span>
            </div>

            {balance && (
              <Chip size="sm" variant="flat" className="self-start">
                {balance.sats.toLocaleString("en-US")} sats
              </Chip>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-default-500">
                <Spinner size="sm" /> Loading BTC balance…
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
