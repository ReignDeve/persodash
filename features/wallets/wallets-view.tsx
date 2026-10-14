"use client";

import { Copy, ExternalLink, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import { useState } from "react";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, SkeletonRows } from "@/components/ui/states";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useDeleteWallet, useRenameWallet } from "@/features/wallets/api";
import { useWallets } from "@/lib/api/queries";
import { copyToClipboard } from "@/lib/hooks/use-copy";
import { formatCrypto, formatEur, formatRelative, shortenAddress } from "@/lib/format";
import { CHAIN_META, type WalletBalance, type WalletChain } from "@/lib/schemas/wallets";

const EXPLORER: Record<WalletChain, (address: string) => string> = {
  bitcoin: (a) => `https://mempool.space/address/${a}`,
  solana: (a) => `https://solscan.io/account/${a}`,
};

export function WalletsView() {
  const { setWalletDialogOpen } = useAppActions();
  const { data, isPending, isFetching, refetch } = useWallets();
  const [renaming, setRenaming] = useState<WalletBalance | null>(null);
  const deleteWallet = useDeleteWallet();

  const exchange = data?.exchange;
  const onChainEur = data?.wallets.reduce((s, w) => s + (w.valueEur ?? 0), 0) ?? 0;
  const exchangeEur = exchange?.status === "ok" ? exchange.valueEur : null;
  const total = data?.totalEur ?? null;
  const share = (v: number | null) => (v !== null && total ? (v / total) * 100 : null);

  return (
    <Page>
      <PageHeader
        title="Wallets"
        description="Watch-only balances across chains and exchanges."
        actions={
          <>
            <Tooltip content={data ? `Updated ${formatRelative(data.fetchedAt)}` : "Refresh"}>
              <Button variant="ghost" size="icon-sm" aria-label="Refresh balances" onClick={() => refetch()}>
                <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              </Button>
            </Tooltip>
            <Button variant="primary" size="sm" onClick={() => setWalletDialogOpen(true)}>
              <Plus />
              Add wallet
            </Button>
          </>
        }
      />

      <MetricStrip className="mb-4">
        <Metric label="Portfolio" loading={isPending} value={formatEur(total)} meta="EUR, at current prices" />
        <Metric
          label="On-chain"
          loading={isPending}
          value={formatEur(onChainEur)}
          meta={`${data?.wallets.length ?? 0} wallets`}
        />
        <Metric
          label="Exchange"
          loading={isPending}
          value={formatEur(exchangeEur)}
          meta={exchange?.status === "ok" ? `${exchange.accounts.length} assets on Coinbase` : "Coinbase not connected"}
        />
        <Metric
          label="Prices"
          loading={isPending}
          value={<span className="text-lg">{formatEur(data?.prices.btcEur ?? null, { compact: true })}</span>}
          meta={`BTC · SOL ${formatEur(data?.prices.solEur ?? null)}`}
        />
      </MetricStrip>

      <Panel className="mb-4">
        <PanelHeader title="On-chain" meta="Public addresses, read-only" />
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : !data?.wallets.length ? (
          <EmptyState
            icon={Wallet}
            title="No wallets yet"
            description="Add a Bitcoin or Solana address to track its balance."
            action={
              <Button size="sm" variant="primary" onClick={() => setWalletDialogOpen(true)}>
                <Plus />
                Add wallet
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Wallet</Th>
                <Th className="hidden md:table-cell">Address</Th>
                <Th className="text-right">Balance</Th>
                <Th className="text-right">Value</Th>
                <Th className="hidden w-36 sm:table-cell">Share</Th>
                <Th className="w-10">
                  <span className="sr-only">Actions</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {data.wallets.map((w) => (
                <Tr key={w.id}>
                  <Td>
                    <div className="flex flex-col">
                      <span className="text-fg">{w.label}</span>
                      <span className="text-xs text-subtle">
                        {CHAIN_META[w.chain].label}
                        {w.managedByEnv ? " · from BTC_ADDRESS" : ""}
                      </span>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(w.address, "Address copied")}
                      className="font-mono text-xs text-muted transition-colors hover:text-fg"
                      title="Copy address"
                    >
                      {shortenAddress(w.address, 8, 6)}
                    </button>
                  </Td>
                  <Td className="text-right font-mono text-sm tabular">
                    {w.error ? (
                      <span className="text-xs text-err">{w.error}</span>
                    ) : (
                      <>
                        {formatCrypto(w.amount, CHAIN_META[w.chain].decimals)}{" "}
                        <span className="text-subtle">{CHAIN_META[w.chain].symbol}</span>
                        {w.tokens.length ? (
                          <div className="text-2xs text-subtle">+ {w.tokens.length} tokens</div>
                        ) : null}
                      </>
                    )}
                  </Td>
                  <Td className="text-right font-mono text-sm text-fg tabular">{formatEur(w.valueEur)}</Td>
                  <Td className="hidden sm:table-cell">
                    <ShareBar percent={share(w.valueEur)} />
                  </Td>
                  <Td>
                    <WalletActions
                      wallet={w}
                      onRename={() => setRenaming(w)}
                      onDelete={() => deleteWallet.mutate(w.id)}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Exchange" meta="Coinbase" />
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : exchange?.status !== "ok" ? (
          <EmptyState title={exchange?.status === "error" ? "Coinbase unavailable" : "Not connected"} description={exchange?.message} />
        ) : exchange.accounts.length === 0 ? (
          <EmptyState title="No balances on Coinbase" />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Asset</Th>
                <Th className="text-right">Balance</Th>
                <Th className="text-right">Value</Th>
                <Th className="hidden w-36 sm:table-cell">Share</Th>
              </Tr>
            </THead>
            <TBody>
              {exchange.accounts.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <span className="text-fg">{a.currencyName}</span>{" "}
                    <span className="font-mono text-xs text-subtle">{a.currency}</span>
                  </Td>
                  <Td className="text-right font-mono text-sm tabular">{formatCrypto(a.amount)}</Td>
                  <Td className="text-right font-mono text-sm text-fg tabular">{formatEur(a.valueEur)}</Td>
                  <Td className="hidden sm:table-cell">
                    <ShareBar percent={share(a.valueEur)} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <RenameDialog wallet={renaming} onClose={() => setRenaming(null)} />
    </Page>
  );
}

function ShareBar({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-xs text-faint">–</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full" style={{ width: `${Math.max(percent, 1)}%`, background: "var(--chart-1)" }} />
      </div>
      <span className="w-10 text-right font-mono text-2xs text-subtle tabular">{percent.toFixed(0)}%</span>
    </div>
  );
}

function WalletActions({
  wallet,
  onRename,
  onDelete,
}: {
  wallet: WalletBalance;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${wallet.label}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<Copy />} onSelect={() => copyToClipboard(wallet.address, "Address copied")}>
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<ExternalLink />}
          onSelect={() => window.open(EXPLORER[wallet.chain](wallet.address), "_blank", "noopener,noreferrer")}
        >
          Open in explorer
        </DropdownMenuItem>
        {!wallet.managedByEnv ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<Pencil />} onSelect={onRename}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Trash2 />} onSelect={onDelete} destructive>
              Remove
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RenameDialog({ wallet, onClose }: { wallet: WalletBalance | null; onClose: () => void }) {
  const rename = useRenameWallet();
  return (
    <Dialog open={wallet !== null} onOpenChange={(o) => !o && onClose()}>
      {wallet ? (
        <DialogContent
          title="Rename wallet"
          footer={
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="rename-wallet">
                Save
              </Button>
            </>
          }
        >
          <form
            id="rename-wallet"
            onSubmit={(e) => {
              e.preventDefault();
              const label = String(new FormData(e.currentTarget).get("label") ?? "").trim();
              if (!label) return;
              rename.mutate({ id: wallet.id, label });
              onClose();
            }}
          >
            <Input name="label" defaultValue={wallet.label} aria-label="Wallet name" autoFocus maxLength={60} />
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
