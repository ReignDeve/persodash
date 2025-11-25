"use client";

import React from "react";
import { Card, CardHeader, CardBody, Chip, Spinner } from "@heroui/react";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import type { CoinbaseAccount, CoinbaseAccountsResponse } from "../../types/coinbase";

function formatAmount(amount: string) {
  const num = Number(amount);
  if (Number.isNaN(num)) return amount;
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

export default function CoinbaseCard() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accounts, setAccounts] = React.useState<CoinbaseAccount[]>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/coinbase/accounts");
        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "Unbekannter Fehler");
          return;
        }

        const data = json as CoinbaseAccountsResponse;

        // Nur Wallet-Accounts mit Balance
        const wallets = data.data.filter(
          (a) =>
            a.type === "wallet" &&
            Number(a.balance?.amount || 0) > 0
        );

        setAccounts(wallets);
      } catch (e) {
        console.error(e);
        setError("Konnte Coinbase Accounts nicht laden");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardBody className="flex items-center gap-3">
          <Spinner size="sm" />
          <span>Lade Coinbase-Daten…</span>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-danger">
        <CardBody>
          <p className="text-sm font-semibold mb-1">Coinbase</p>
          <p className="text-xs text-danger">{error}</p>
        </CardBody>
      </Card>
    );
  }

  // falls alles 0 ist o.ä.
  if (accounts.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex items-center gap-3">
          <BanknotesIcon className="size-6" />
          <div>
            <p className="font-semibold text-sm">Coinbase</p>
            <p className="text-[11px] text-default-500">
              Keine Assets mit Balance gefunden
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // primäres Wallet nach vorne
  const sorted = [...accounts].sort((a, b) =>
    a.primary === b.primary ? 0 : a.primary ? -1 : 1
  );

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="flex items-center gap-3">
        <BanknotesIcon className="size-7" />
        <div className="flex flex-col items-start">
          <p className="font-semibold text-sm">Coinbase</p>
          <p className="text-[11px] text-default-500">
            Overview over crypto assets
          </p>
        </div>
      </CardHeader>

      <CardBody className="space-y-3">
        {sorted.slice(0, 4).map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {acc.name || acc.currency.code}
              </span>
              <span className="text-[11px] text-default-500">
                {acc.currency.code} · {acc.currency.name}
              </span>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold">
                {formatAmount(acc.balance.amount)} {acc.balance.currency}
              </div>
              {acc.primary && (
                <Chip size="sm" color="primary" variant="flat" className="mt-1">
                  Primary
                </Chip>
              )}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
