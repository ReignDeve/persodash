"use client";

import { Cpu, RefreshCw } from "lucide-react";
import { useState } from "react";

import { HashrateChart, Sparkline } from "@/components/charts/hashrate-chart";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { KeyValue, Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/states";
import { Status } from "@/components/ui/status";
import { workerStatus } from "@/features/miner/status";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useMiner } from "@/lib/api/queries";
import { copyToClipboard } from "@/lib/hooks/use-copy";
import {
  formatCompact,
  formatDateTime,
  formatDuration,
  formatHashrate,
  formatRelative,
  shortenAddress,
} from "@/lib/format";
import type { MinerWorker } from "@/lib/schemas/miner";

export function MinerView() {
  const { data, isPending, isFetching, refetch, error } = useMiner();
  const [selected, setSelected] = useState<MinerWorker | null>(null);

  if (error) {
    return (
      <Page>
        <PageHeader title="Miner" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  if (data && data.status !== "ok") {
    return (
      <Page>
        <PageHeader title="Miner" />
        <Panel>
          <EmptyState
            icon={Cpu}
            title={data.status === "not_configured" ? "Mining not configured" : "Public Pool unavailable"}
            description={data.message}
            action={
              data.status === "error" ? (
                <Button size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              ) : null
            }
          />
        </Panel>
      </Page>
    );
  }

  const ok = data?.status === "ok" ? data : null;

  return (
    <Page>
      <PageHeader
        title="Miner"
        description={
          ok ? (
            <button
              type="button"
              onClick={() => copyToClipboard(ok.address, "Address copied")}
              className="font-mono text-xs transition-colors hover:text-fg"
              title="Copy payout address"
            >
              public-pool.io · {shortenAddress(ok.address, 10, 6)}
            </button>
          ) : (
            "Public Pool"
          )
        }
        actions={
          <Tooltip content={ok ? `Updated ${formatRelative(ok.fetchedAt)} · auto-refresh 1 min` : "Refresh"}>
            <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={() => refetch()}>
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            </Button>
          </Tooltip>
        }
      />

      <MetricStrip className="mb-4">
        <Metric
          label="Hashrate"
          loading={isPending}
          value={ok ? formatHashrate(ok.totalHashrate) : null}
          meta="Total, all workers"
          aside={ok ? <Sparkline data={ok.history} /> : null}
        />
        <Metric
          label="Workers"
          loading={isPending}
          value={ok ? `${ok.onlineCount}/${ok.workers.length}` : null}
          meta="online"
        />
        <Metric
          label="Best difficulty"
          loading={isPending}
          value={ok ? formatCompact(ok.bestDifficulty) : null}
          meta="Since the address joined the pool"
        />
        <Metric
          label="Alert threshold"
          loading={isPending}
          value={ok ? formatHashrate(ok.thresholds.minHashrate, 0) : null}
          meta={ok ? `Offline after ${ok.thresholds.inactiveMinutes} min` : null}
        />
      </MetricStrip>

      <Panel className="mb-4">
        <PanelHeader title="Hashrate" meta="Last 48 hours · snapshot every 10 min" />
        <div className="px-2 pt-3 pb-2">
          {isPending ? (
            <Skeleton className="mx-2 h-[220px]" />
          ) : ok && ok.history.length >= 2 && ok.history.some((p) => p.hashrate > 0) ? (
            <HashrateChart data={ok.history} />
          ) : ok && ok.history.length >= 2 ? (
            <EmptyState title="No hashrate in the last 48 hours" description="Workers have not submitted any shares." />
          ) : (
            <EmptyState
              title="History is being recorded"
              description="PersoDash stores a snapshot every 10 minutes. The chart appears after the first two."
            />
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Workers" meta={ok ? `${ok.workers.length} sessions` : null} />
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : !ok?.workers.length ? (
          <EmptyState icon={Cpu} title="No workers connected" description="Start a miner pointing at your address." />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th className="w-28">Status</Th>
                <Th>Worker</Th>
                <Th className="text-right">Hashrate</Th>
                <Th className="hidden text-right md:table-cell">Best diff.</Th>
                <Th className="hidden text-right lg:table-cell">Uptime</Th>
                <Th className="text-right">Last seen</Th>
              </Tr>
            </THead>
            <TBody>
              {ok.workers.map((w) => {
                const status = workerStatus(w);
                return (
                  <Tr
                    key={w.sessionId}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:bg-hover focus-visible:outline-none"
                    onClick={() => setSelected(w)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(w)}
                  >
                    <Td>
                      <Status tone={status.tone} label={status.label} />
                    </Td>
                    <Td>
                      <span className="text-fg">{w.name || "Unnamed"}</span>
                      {w.isMine ? <span className="ml-2 label text-accent">yours</span> : null}
                      <div className="font-mono text-2xs text-subtle">{w.sessionId}</div>
                    </Td>
                    <Td className="text-right font-mono tabular text-fg">{formatHashrate(w.hashrate)}</Td>
                    <Td className="hidden text-right font-mono tabular text-muted md:table-cell">
                      {formatCompact(w.bestDifficulty)}
                    </Td>
                    <Td className="hidden text-right font-mono tabular text-muted lg:table-cell">
                      {formatDuration((Date.parse(w.lastSeenAt) - Date.parse(w.startedAt)) / 1000)}
                    </Td>
                    <Td className="text-right font-mono text-xs tabular text-muted">{formatRelative(w.lastSeenAt)}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Panel>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        {selected ? (
          <SheetContent title={selected.name || selected.sessionId}>
            <div className="px-4 py-3">
              <Status {...workerStatus(selected)} />
              <dl className="mt-3 divide-y divide-line">
                <KeyValue label="Session" mono>{selected.sessionId}</KeyValue>
                <KeyValue label="Hashrate" mono>{formatHashrate(selected.hashrate)}</KeyValue>
                <KeyValue label="Best difficulty" mono>{formatCompact(selected.bestDifficulty)}</KeyValue>
                <KeyValue label="Started" mono>{formatDateTime(selected.startedAt)}</KeyValue>
                <KeyValue label="Last seen" mono>{formatDateTime(selected.lastSeenAt)}</KeyValue>
                <KeyValue label="Uptime" mono>
                  {formatDuration((Date.parse(selected.lastSeenAt) - Date.parse(selected.startedAt)) / 1000)}
                </KeyValue>
              </dl>
            </div>
          </SheetContent>
        ) : null}
      </Dialog>
    </Page>
  );
}
