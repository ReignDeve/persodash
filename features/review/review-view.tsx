"use client";

import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import { Tooltip } from "@/components/ui/tooltip";
import { useReview } from "@/lib/api/queries";
import { formatDayMonth, formatEur, formatHashrate, formatKm } from "@/lib/format";
import type { WeeklyReview } from "@/lib/schemas/review";
import { cn } from "@/lib/utils";

function rangeLabel(week: WeeklyReview["week"]) {
  const start = parseISO(week.start);
  const end = parseISO(week.end);
  const sameMonth = start.getMonth() === end.getMonth();
  return `${format(start, sameMonth ? "d" : "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-4 text-xs text-subtle">{children}</p>;
}

export function ReviewView() {
  const router = useRouter();
  const params = useSearchParams();
  const weekParam = params.get("week") ?? undefined;
  const { data, isPending, error, refetch, isFetching } = useReview(weekParam);

  const go = (week: string | null) => router.push(week ? `/review?week=${week}` : "/review");

  if (error) {
    return (
      <Page>
        <PageHeader title="Weekly review" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={data ? `Week ${data.week.number}` : "Weekly review"}
        description={data ? `${rangeLabel(data.week)}${data.week.isCurrent ? " · so far" : ""}` : " "}
        actions={
          <div className={cn("flex items-center gap-1 transition-opacity", isFetching && "opacity-60")}>
            <Tooltip content="Previous week">
              <Button variant="ghost" size="icon-sm" aria-label="Previous week" disabled={!data} onClick={() => data && go(data.week.previous)}>
                <ChevronLeft />
              </Button>
            </Tooltip>
            {data && !data.week.isCurrent ? (
              <Button variant="ghost" size="sm" onClick={() => go(null)}>
                This week
              </Button>
            ) : null}
            <Tooltip content="Next week">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next week"
                disabled={!data?.week.next}
                onClick={() => data?.week.next && go(data.week.next)}
              >
                <ChevronRight />
              </Button>
            </Tooltip>
          </div>
        }
      />

      {isPending || !data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title="Highlights" meta="Generated from everything PersoDash tracks" />
            {data.highlights.length ? (
              <ul className="py-1">
                {data.highlights.map((h) => (
                  <li key={h.text} className="flex items-start gap-3 px-4 py-2 text-sm text-fg">
                    <StatusDot tone={h.tone} className="mt-[7px]" />
                    {h.text}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>A quiet week – nothing tracked yet.</Empty>
            )}
          </Panel>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <LogbookPanel review={data} />
            <CodePanel review={data} />
            <RoutinesPanel review={data} />
            <ServicesPanel review={data} />
            <MoneyPanel review={data} />
            <Panel>
              <PanelHeader title="Other" />
              <dl className="divide-y divide-line px-4 py-1">
                <KeyValue label="Notes captured" mono>{data.inbox.captured}</KeyValue>
                <KeyValue label="Notes cleared" mono>{data.inbox.done}</KeyValue>
                <KeyValue label="Inbox open now" mono>{data.inbox.open}</KeyValue>
                <KeyValue label="Alerts" mono>
                  {data.alerts.error} errors · {data.alerts.warning} warnings
                </KeyValue>
                <KeyValue label="Miner" mono>
                  {data.miner.avgHashrate === null
                    ? "no data"
                    : `${formatHashrate(data.miner.avgHashrate)} · ${Math.round(data.miner.onlineShare ?? 0)} % online`}
                </KeyValue>
              </dl>
            </Panel>
          </div>
        </div>
      )}
    </Page>
  );
}

function LogbookPanel({ review }: { review: WeeklyReview }) {
  const { km, previousKm, trips, businessKm, days } = review.logbook;
  const max = Math.max(...days.map((d) => d.km), 1);
  return (
    <Panel>
      <PanelHeader
        title="Logbook"
        meta={`${trips} trip${trips === 1 ? "" : "s"}`}
        actions={<span className="font-mono text-xs text-fg tabular">{formatKm(km)}</span>}
      />
      <div className="px-4 pt-3 pb-3">
        <div className="flex h-20 items-end gap-2" role="img" aria-label="Kilometres per day">
          {days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5" title={`${formatDayMonth(d.day)}: ${formatKm(d.km)}`}>
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${Math.max((d.km / max) * 64, d.km ? 4 : 1)}px`, background: d.km ? "var(--chart-1)" : "var(--hover)" }}
              />
              <span className="font-mono text-2xs text-subtle">{format(parseISO(d.day), "EEEEE")}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          {previousKm ? `Last week ${formatKm(previousKm)}` : "No trips last week"}
          {km ? ` · ${formatKm(businessKm)} business` : ""}
        </p>
      </div>
    </Panel>
  );
}

function CodePanel({ review }: { review: WeeklyReview }) {
  const { commits, deployments, projects } = review.code;
  return (
    <Panel>
      <PanelHeader
        title="Projects"
        meta="Commits · deploys"
        actions={
          <span className="font-mono text-xs text-fg tabular">
            {commits} · {deployments}
          </span>
        }
      />
      {projects.length ? (
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <li key={p.name} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-fg">{p.name}</span>
              <span className="font-mono text-xs text-muted tabular">
                {p.commits} commit{p.commits === 1 ? "" : "s"} · {p.deployments} deploy{p.deployments === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          No commits or deploys this week.{" "}
          <Link href="/projects" className="text-fg underline-offset-2 hover:underline">
            Link repos in Projects
          </Link>{" "}
          to track them (private repos need GITHUB_TOKEN).
        </Empty>
      )}
    </Panel>
  );
}

function RoutinesPanel({ review }: { review: WeeklyReview }) {
  const { done, skipped, missed, items } = review.routines;
  return (
    <Panel>
      <PanelHeader title="Routines" meta={`${done} done · ${skipped} skipped · ${missed} open`} />
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((r, i) => (
            <li key={`${r.title}-${i}`} className="flex items-center gap-3 px-4 py-2 text-sm">
              <StatusDot tone={r.outcome === "done" ? "ok" : r.outcome === "missed" ? "warn" : "idle"} />
              <span className="flex-1 truncate text-fg">{r.title}</span>
              <span className="label">{r.outcome}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Nothing was due.{" "}
          <Link href="/routines" className="text-fg underline-offset-2 hover:underline">
            Set up routines
          </Link>{" "}
          for things you do regularly.
        </Empty>
      )}
    </Panel>
  );
}

function ServicesPanel({ review }: { review: WeeklyReview }) {
  const { monitors, incidents } = review.services;
  return (
    <Panel>
      <PanelHeader title="Services" meta={incidents ? `${incidents} outage${incidents === 1 ? "" : "s"}` : "No outages"} />
      {monitors.length ? (
        <ul className="divide-y divide-line">
          {monitors.map((m) => (
            <li key={m.name} className="flex items-center gap-3 px-4 py-2 text-sm">
              <StatusDot tone={m.incidents ? "err" : m.uptime === null ? "idle" : "ok"} />
              <span className="flex-1 truncate text-fg">{m.name}</span>
              <span className="font-mono text-xs text-muted tabular">
                {m.uptime === null ? "no data" : `${m.uptime >= 99.995 ? "100" : m.uptime.toFixed(2)} %`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          No services monitored.{" "}
          <Link href="/services" className="text-fg underline-offset-2 hover:underline">
            Add one
          </Link>
          .
        </Empty>
      )}
    </Panel>
  );
}

function MoneyPanel({ review }: { review: WeeklyReview }) {
  const { portfolioStart, portfolioEnd, renewals, renewalsEur } = review.money;
  const change = portfolioStart !== null && portfolioEnd !== null ? portfolioEnd - portfolioStart : null;
  return (
    <Panel>
      <PanelHeader
        title="Money"
        actions={
          portfolioEnd !== null ? <span className="font-mono text-xs text-fg tabular">{formatEur(portfolioEnd)}</span> : null
        }
      />
      <dl className="divide-y divide-line px-4 py-1">
        <KeyValue label="Portfolio change" mono>
          {change === null ? "tracking starts today" : `${change >= 0 ? "+" : "−"}${formatEur(Math.abs(change))}`}
        </KeyValue>
        <KeyValue label="Renewals" mono>
          {renewals.length ? `${renewals.length} · ${formatEur(renewalsEur)}` : "none"}
        </KeyValue>
      </dl>
      {renewals.length ? (
        <ul className="divide-y divide-line border-t">
          {renewals.map((r) => (
            <li key={`${r.name}-${r.date}`} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-12 font-mono text-xs text-muted tabular">{formatDayMonth(r.date)}</span>
              <span className="flex-1 truncate text-fg">{r.name}</span>
              <span className="font-mono text-xs text-muted tabular">{r.amount}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
