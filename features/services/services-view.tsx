"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, ExternalLink, MoreHorizontal, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LatencyChart } from "@/components/charts/latency-chart";
import { UptimeBars } from "@/components/charts/uptime-bars";
import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { KeyValue, Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Status, type Tone } from "@/components/ui/status";
import { api } from "@/lib/api/client";
import { queryKeys, useServices } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import { formatDateTime, formatRelative, hostname } from "@/lib/format";
import type { MonitorInput, MonitorSummary } from "@/lib/schemas/services";

export const MONITOR_STATE: Record<MonitorSummary["state"], { tone: Tone; label: string }> = {
  up: { tone: "ok", label: "Up" },
  down: { tone: "err", label: "Down" },
  pending: { tone: "idle", label: "Pending" },
  paused: { tone: "idle", label: "Paused" },
};

const pct = (v: number | null) => (v === null ? "–" : `${v >= 99.995 ? "100" : v.toFixed(2)} %`);

function sinceLabel(m: MonitorSummary) {
  if (!m.since || m.state === "paused" || m.state === "pending") return null;
  return `${m.state === "up" ? "up" : "down"} ${formatRelative(m.since).replace(" ago", "")}`;
}

function toInput(m: MonitorSummary, patch: Partial<MonitorInput> = {}): MonitorInput {
  return {
    name: m.name,
    url: m.url,
    expectedStatus: m.expectedStatus,
    projectId: m.project?.id ?? null,
    enabled: m.enabled,
    ...patch,
  };
}

export function ServicesView() {
  const { openEditor } = useAppActions();
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useServices();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { save, remove } = useCrud<MonitorInput>({
    endpoint: "/api/services",
    noun: "Service",
    invalidate: [queryKeys.services, queryKeys.projects],
  });

  const checkNow = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean; latencyMs: number | null; error: string | null }>(`/api/services/${id}/check`, { method: "POST" }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Up · ${r.latencyMs} ms`);
      else toast.error(`Down · ${r.error ?? "no response"}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });

  const monitors = data?.monitors ?? [];
  const active = monitors.filter((m) => m.enabled);
  const down = active.filter((m) => m.state === "down");
  const uptimes = active.map((m) => m.uptime30d).filter((v): v is number => v !== null);
  const latencies = active.map((m) => m.avgLatency24h).filter((v): v is number => v !== null);
  const selected = monitors.find((m) => m.id === selectedId) ?? null;

  if (error) {
    return (
      <Page>
        <PageHeader title="Services" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  const addButton = (
    <Button variant="primary" size="sm" onClick={() => openEditor({ kind: "monitor", item: null })}>
      <Plus />
      Add service
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Services"
        description="Uptime of your own services, checked every 2 minutes from this server."
        actions={addButton}
      />

      <MetricStrip className="mb-4">
        <Metric
          label="Up"
          loading={isPending}
          value={`${active.length - down.length}/${active.length}`}
          meta={down.length ? `${down.length} down right now` : active.length ? "All responding" : "No services yet"}
        />
        <Metric
          label="Uptime 30d"
          loading={isPending}
          value={uptimes.length ? pct(Math.min(...uptimes)) : "–"}
          meta="Lowest of all services"
        />
        <Metric
          label="Avg. response"
          loading={isPending}
          value={latencies.length ? `${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)} ms` : "–"}
          meta="Last 24 hours"
        />
        <Metric label="Monitored" loading={isPending} value={monitors.length} meta={`${monitors.length - active.length} paused`} />
      </MetricStrip>

      <Panel>
        <PanelHeader title="Monitors" meta="Last 30 days" />
        {isPending ? (
          <SkeletonRows rows={4} />
        ) : monitors.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Monitor your own services"
            description="Add anything with an HTTP endpoint – your VPS, LUCY's API, a home server. You'll be notified the moment it stops responding."
            action={addButton}
          />
        ) : (
          <ul className="divide-y divide-line">
            {monitors.map((m) => (
              <li key={m.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(m.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(m.id)}
                  className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none md:grid-cols-[6rem_minmax(0,1fr)_auto_5rem_4.5rem_2rem]"
                >
                  <Status {...MONITOR_STATE[m.state]} className="hidden md:inline-flex" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Status {...MONITOR_STATE[m.state]} className="md:hidden" />
                      <span className="truncate text-sm text-fg">{m.name}</span>
                      {m.project ? <span className="hidden truncate text-xs text-subtle sm:inline">{m.project.name}</span> : null}
                    </div>
                    <div className="truncate font-mono text-2xs text-subtle">
                      {hostname(m.url)}
                      {sinceLabel(m) ? ` · ${sinceLabel(m)}` : ""}
                    </div>
                  </div>
                  <UptimeBars days={m.days} className="col-span-2 md:col-span-1" />
                  <span className="hidden text-right font-mono text-xs text-fg tabular md:block">{pct(m.uptime30d)}</span>
                  <span className="hidden text-right font-mono text-xs text-muted tabular md:block">
                    {m.avgLatency24h !== null ? `${m.avgLatency24h} ms` : "–"}
                  </span>
                  <div className="row-start-1 col-start-2 md:row-auto md:col-auto" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem icon={<RefreshCw />} onSelect={() => checkNow.mutate(m.id)} disabled={!m.enabled}>
                          Check now
                        </DropdownMenuItem>
                        <DropdownMenuItem icon={<ExternalLink />} onSelect={() => window.open(m.url, "_blank", "noopener,noreferrer")}>
                          Open URL
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem icon={<Pencil />} onSelect={() => openEditor({ kind: "monitor", item: m })}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          icon={m.enabled ? <Pause /> : <Play />}
                          onSelect={() => save.mutate({ id: m.id, input: toInput(m, { enabled: !m.enabled }) })}
                        >
                          {m.enabled ? "Pause" : "Resume"}
                        </DropdownMenuItem>
                        <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate(m.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected ? (
          <SheetContent title={selected.name}>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <Status {...MONITOR_STATE[selected.state]} />
                <Button size="sm" variant="ghost" onClick={() => checkNow.mutate(selected.id)} disabled={checkNow.isPending}>
                  <RefreshCw className={checkNow.isPending ? "animate-spin" : undefined} />
                  Check now
                </Button>
              </div>
              <div className="mt-4">
                <div className="label mb-2">Response time · 24h</div>
                {selected.latency.length > 1 ? (
                  <LatencyChart data={selected.latency} />
                ) : (
                  <p className="text-xs text-subtle">Not enough checks yet.</p>
                )}
              </div>
              <div className="mt-4">
                <div className="label mb-2">Last 30 days</div>
                <UptimeBars days={selected.days} />
              </div>
              <dl className="mt-4 divide-y divide-line">
                <KeyValue label="URL" mono>{selected.url}</KeyValue>
                <KeyValue label="Expects" mono>{selected.expectedStatus ?? "< 400"}</KeyValue>
                <KeyValue label="Uptime 24h" mono>{pct(selected.uptime24h)}</KeyValue>
                <KeyValue label="Uptime 30d" mono>{pct(selected.uptime30d)}</KeyValue>
                <KeyValue label="Last check" mono>{formatDateTime(selected.lastCheck?.at)}</KeyValue>
                <KeyValue label="Last status" mono>
                  {selected.lastCheck?.statusCode ?? selected.lastCheck?.error ?? "–"}
                </KeyValue>
                {selected.project ? <KeyValue label="Project">{selected.project.name}</KeyValue> : null}
              </dl>
            </div>
          </SheetContent>
        ) : null}
      </Dialog>
    </Page>
  );
}
