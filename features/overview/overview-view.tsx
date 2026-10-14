"use client";

import { format } from "date-fns";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  Cpu,
  FolderGit2,
  Globe,
  Plus,
  Route,
  Search,
  StickyNote,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts/hashrate-chart";
import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Metric } from "@/components/ui/metric";
import { Page } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, Skeleton, SkeletonRows } from "@/components/ui/states";
import { Status, StatusDot, type Tone } from "@/components/ui/status";
import { workerStatus } from "@/features/miner/status";
import { siteStatus } from "@/features/websites/status";
import { CaptureField } from "@/features/inbox/capture-field";
import { PROJECT_TONE } from "@/features/projects/status";
import { RoutineRow, dueLabel } from "@/features/routines/routine-row";
import { renewalLabel } from "@/features/subscriptions/format";
import {
  useActivity,
  useLogbook,
  useMiner,
  useNotes,
  useNotifications,
  useProjects,
  useRoutines,
  useServices,
  useSubscriptions,
  useSystem,
  useWallets,
  useWebsites,
} from "@/lib/api/queries";
import { formatDayMonth, formatEur, formatHashrate, formatKm, formatRelative } from "@/lib/format";
import type { ActivityItem } from "@/lib/schemas/overview";
import { cn } from "@/lib/utils";

type Attention = { id: string; tone: Tone; title: string; detail: string | null; href: string };

/** Everything that currently deserves a look, most severe first. */
function useAttention(): { items: Attention[]; loading: boolean } {
  const miner = useMiner();
  const websites = useWebsites();
  const notifications = useNotifications();
  const services = useServices();
  const subscriptions = useSubscriptions();
  const routines = useRoutines();

  const items: Attention[] = [];

  for (const r of routines.data?.items ?? []) {
    if (r.bucket === "overdue") {
      items.push({ id: `routine:${r.id}`, tone: "warn", title: `${r.title} · ${dueLabel(r)}`, detail: null, href: "/routines" });
    }
  }

  for (const m of services.data?.monitors ?? []) {
    if (m.state === "down") {
      items.push({
        id: `monitor:${m.id}`,
        tone: "err",
        title: `${m.name} · Down`,
        detail: m.lastCheck?.error ?? m.url,
        href: "/services",
      });
    }
  }

  for (const sub of subscriptions.data?.items ?? []) {
    if (sub.active && sub.daysUntilRenewal <= 3) {
      items.push({
        id: `subscription:${sub.id}`,
        tone: "warn",
        title: `${sub.name} renews ${renewalLabel(sub.daysUntilRenewal)}`,
        detail: (sub.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: sub.currency }),
        href: "/subscriptions",
      });
    }
  }

  if (websites.data?.status === "ok") {
    for (const w of websites.data.websites) {
      const s = siteStatus(w);
      if (s.tone === "err" || s.tone === "warn") {
        items.push({ id: `site:${w.id}`, tone: s.tone, title: `${w.name} · ${s.label}`, detail: w.domains[0] ?? "Vercel project", href: "/websites" });
      }
    }
  } else if (websites.data?.status === "error") {
    items.push({ id: "vercel", tone: "warn", title: "Vercel unreachable", detail: websites.data.message, href: "/websites" });
  }

  if (miner.data?.status === "ok") {
    if (miner.data.workers.length === 0) {
      items.push({ id: "miner:none", tone: "err", title: "No mining workers connected", detail: "Public Pool reports no sessions", href: "/miner" });
    }
    for (const w of miner.data.workers) {
      const s = workerStatus(w);
      if (s.tone !== "ok") {
        items.push({
          id: `worker:${w.sessionId}`,
          tone: s.tone,
          title: `Worker ${w.name || w.sessionId} · ${s.label}`,
          detail: `${formatHashrate(w.hashrate)} · seen ${formatRelative(w.lastSeenAt)}`,
          href: "/miner",
        });
      }
    }
  } else if (miner.data?.status === "error") {
    items.push({ id: "pool", tone: "warn", title: "Public Pool unreachable", detail: miner.data.message, href: "/miner" });
  }

  const unreadErrors = notifications.data?.items.filter((n) => !n.read && n.severity === "error") ?? [];
  if (unreadErrors.length) {
    items.push({
      id: "notifications",
      tone: "err",
      title: `${unreadErrors.length} unread error${unreadErrors.length > 1 ? "s" : ""}`,
      detail: unreadErrors[0].title,
      href: "/notifications",
    });
  }

  const rank: Record<Tone, number> = { err: 0, warn: 1, info: 2, idle: 3, ok: 4 };
  items.sort((a, b) => rank[a.tone] - rank[b.tone]);
  return { items, loading: miner.isPending || websites.isPending };
}

export function OverviewView() {
  const { openTripDialog, setCommandOpen } = useAppActions();
  const attention = useAttention();
  const now = new Date();

  return (
    <Page>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">{format(now, "EEEE · d MMMM yyyy")}</div>
          <h1 className="mt-1 flex items-center gap-2.5 text-xl font-medium tracking-tight">
            {attention.loading ? (
              <Skeleton className="h-6 w-56" />
            ) : attention.items.length ? (
              <>
                <StatusDot tone={attention.items[0].tone} pulse />
                {attention.items.length} {attention.items.length === 1 ? "thing needs" : "things need"} attention
              </>
            ) : (
              <>
                <StatusDot tone="ok" />
                All systems nominal
              </>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/review">
              <CalendarRange />
              This week
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCommandOpen(true)} className="hidden md:inline-flex">
            <Search />
            Search
            <Kbd>⌘K</Kbd>
          </Button>
          {/* On phones the bottom bar's + does this. */}
          <Button variant="primary" size="sm" onClick={() => openTripDialog()} className="hidden md:inline-flex">
            <Plus />
            Log trip
          </Button>
        </div>
      </div>

      {attention.items.length ? (
        <Panel className="mb-4">
          <ul className="divide-y divide-line">
            {attention.items.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
                  <StatusDot tone={a.tone} />
                  <span className="text-sm text-fg">{a.title}</span>
                  {a.detail ? <span className="hidden truncate text-xs text-subtle sm:inline">{a.detail}</span> : null}
                  <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Instruments />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
          <TodayPanel />
          <FocusPanel />
          <ActivityPanel />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
          <InboxPanel />
          <SystemPanel />
          <UpcomingPanel />
        </div>
      </div>
    </Page>
  );
}

function InstrumentLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block bg-surface px-4 py-3.5 transition-colors hover:bg-raised focus-visible:bg-raised">
      {children}
    </Link>
  );
}

function Instruments() {
  const miner = useMiner();
  const websites = useWebsites();
  const wallets = useWallets();
  const logbook = useLogbook();

  const m = miner.data?.status === "ok" ? miner.data : null;
  const w = websites.data?.status === "ok" ? websites.data.websites : null;
  const up = w?.filter((s) => siteStatus(s).tone === "ok").length ?? 0;
  const summary = logbook.data?.summary;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-[inset_0_0_0_1px_var(--line)] lg:grid-cols-4">
      <InstrumentLink href="/miner">
        <Metric
          label="Hashrate"
          loading={miner.isPending}
          value={m ? formatHashrate(m.totalHashrate) : "–"}
          meta={m ? `${m.onlineCount}/${m.workers.length} workers online` : miner.data?.status === "not_configured" ? "Not configured" : "Unavailable"}
          aside={m ? <Sparkline data={m.history} /> : null}
        />
      </InstrumentLink>
      <InstrumentLink href="/websites">
        <Metric
          label="Websites"
          loading={websites.isPending}
          value={w ? `${up}/${w.length}` : "–"}
          meta={w ? (up === w.length ? "All online" : `${w.length - up} with issues`) : "Vercel not connected"}
        />
      </InstrumentLink>
      <InstrumentLink href="/wallets">
        <Metric
          label="Portfolio"
          loading={wallets.isPending}
          value={formatEur(wallets.data?.totalEur ?? null)}
          meta={wallets.data ? `${wallets.data.wallets.length} wallets${wallets.data.exchange.status === "ok" ? " + Coinbase" : ""}` : null}
        />
      </InstrumentLink>
      <InstrumentLink href="/logbook">
        <Metric
          label="Driven this month"
          loading={logbook.isPending}
          value={summary ? formatKm(summary.thisMonthKilometers) : "–"}
          meta={summary ? `${formatKm(summary.lastMonthKilometers)} last month` : null}
        />
      </InstrumentLink>
    </div>
  );
}

const ACTIVITY_ICON: Record<ActivityItem["kind"], LucideIcon> = {
  trip: Route,
  deployment: Globe,
  notification: Bell,
  wallet: Wallet,
  note: StickyNote,
  routine: CalendarCheck,
};

function ActivityPanel() {
  const { data, isPending } = useActivity();
  return (
    <Panel>
      <PanelHeader title="Activity" meta="Across all modules" />
      {isPending ? (
        <SkeletonRows rows={6} />
      ) : !data?.items.length ? (
        <EmptyState icon={CheckCircle2} title="Nothing yet" description="Trips, deployments and alerts appear here." />
      ) : (
        <ol className="py-1">
          {data.items.map((item) => {
            const Icon = ACTIVITY_ICON[item.kind];
            return (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-hover">
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      item.severity === "error" ? "text-err" : item.severity === "warning" ? "text-warn" : "text-subtle",
                    )}
                    strokeWidth={1.6}
                  />
                  <span className="max-w-[60%] shrink-0 truncate text-sm text-fg">{item.title}</span>
                  {item.detail ? <span className="hidden min-w-0 truncate text-xs text-subtle sm:inline">{item.detail}</span> : null}
                  <time dateTime={item.at} className="ml-auto shrink-0 font-mono text-2xs text-subtle tabular">
                    {formatRelative(item.at)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="label">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function SystemPanel() {
  const system = useSystem();
  const miner = useMiner();
  const websites = useWebsites();
  const s = system.data;

  const minerTone: { tone: Tone; label: string } =
    miner.data?.status === "ok"
      ? miner.data.onlineCount === miner.data.workers.length && miner.data.workers.length > 0
        ? { tone: "ok", label: "Online" }
        : { tone: "warn", label: `${miner.data.onlineCount}/${miner.data.workers.length} online` }
      : { tone: "idle", label: miner.data?.status === "not_configured" ? "Not set" : "Unknown" };

  const sites = websites.data?.status === "ok" ? websites.data.websites : null;
  const siteTone: { tone: Tone; label: string } = sites
    ? sites.every((w) => siteStatus(w).tone === "ok")
      ? { tone: "ok", label: "Online" }
      : { tone: "err", label: "Degraded" }
    : { tone: "idle", label: "Not set" };

  return (
    <Panel>
      <PanelHeader title="Status" meta={s?.hostname} />
      <div className="divide-y divide-line">
        <StatusRow label="Miner">
          {miner.isPending ? <Skeleton className="h-3 w-16" /> : <Status {...minerTone} />}
        </StatusRow>
        <ServicesStatusRow />
        <StatusRow label="Websites">
          {websites.isPending ? <Skeleton className="h-3 w-16" /> : <Status {...siteTone} />}
        </StatusRow>
        <StatusRow label="Database">
          {s ? (
            <Status tone={s.database.ok ? "ok" : "err"} label={s.database.ok ? `Healthy · ${s.database.latencyMs}ms` : "Down"} />
          ) : (
            <Skeleton className="h-3 w-16" />
          )}
        </StatusRow>
        <StatusRow label="Server load">
          {s ? (
            <span className="font-mono text-xs text-fg tabular">
              {s.load[0].toFixed(2)} <span className="text-subtle">/ {s.cpuCount} cpu</span>
            </span>
          ) : (
            <Skeleton className="h-3 w-16" />
          )}
        </StatusRow>
        <StatusRow label="Memory">
          {s ? (
            <span className="font-mono text-xs text-fg tabular">{Math.round((s.memory.used / s.memory.total) * 100)} %</span>
          ) : (
            <Skeleton className="h-3 w-10" />
          )}
        </StatusRow>
        {s?.disk ? (
          <StatusRow label="Disk">
            <span className="font-mono text-xs text-fg tabular">{Math.round((s.disk.used / s.disk.total) * 100)} %</span>
          </StatusRow>
        ) : null}
      </div>
      <div className="border-t px-4 py-2.5">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-subtle transition-colors hover:text-fg">
          <Cpu className="size-3" />
          System details
        </Link>
      </div>
    </Panel>
  );
}

function ServicesStatusRow() {
  const { data, isPending } = useServices();
  const active = data?.monitors.filter((m) => m.enabled) ?? [];
  const down = active.filter((m) => m.state === "down").length;
  return (
    <StatusRow label="Services">
      {isPending ? (
        <Skeleton className="h-3 w-16" />
      ) : !active.length ? (
        <Status tone="idle" label="None" />
      ) : (
        <Status tone={down ? "err" : "ok"} label={down ? `${down} down` : `${active.length} up`} />
      )}
    </StatusRow>
  );
}

const FOCUS_LIMIT = 5;

/** The next step of each active project – the open loops across everything being built. */
function FocusPanel() {
  const { data, isPending } = useProjects();
  const active = (data?.projects ?? []).filter((p) => p.status === "active").slice(0, FOCUS_LIMIT);

  return (
    <Panel>
      <PanelHeader
        title="Focus"
        meta="Next step per active project"
        actions={
          <Link href="/projects" className="text-xs text-subtle transition-colors hover:text-fg">
            All projects
          </Link>
        }
      />
      {isPending ? (
        <SkeletonRows rows={3} />
      ) : !active.length ? (
        <EmptyState
          icon={FolderGit2}
          title="No active projects"
          description="Add or import your projects to see their next steps here."
          className="py-8"
        />
      ) : (
        <ul className="py-1">
          {active.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects?project=${p.id}`}
                className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 transition-colors hover:bg-hover"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <StatusDot tone={PROJECT_TONE[p.status]} />
                  <span className="truncate text-sm text-fg">{p.name}</span>
                </span>
                <span className={cn("truncate text-xs", p.nextStep ? "text-muted" : "text-faint")}>
                  {p.nextStep ? `→ ${p.nextStep}` : "No next step"}
                </span>
                <span className="font-mono text-2xs text-subtle tabular">{formatRelative(p.lastActivityAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const UPCOMING_DAYS = 30;
const UPCOMING_LIMIT = 6;

function UpcomingPanel() {
  const { data, isPending } = useSubscriptions();
  const upcoming = (data?.items ?? [])
    .filter((s) => s.active && s.daysUntilRenewal <= UPCOMING_DAYS)
    .slice(0, UPCOMING_LIMIT);

  return (
    <Panel>
      <PanelHeader
        title="Upcoming"
        meta="Renewals · 30 days"
        actions={
          data ? <span className="font-mono text-xs text-muted tabular">{formatEur(data.totals.monthlyEur)}/mo</span> : null
        }
      />
      {isPending ? (
        <SkeletonRows rows={3} />
      ) : !upcoming.length ? (
        <p className="px-4 py-5 text-xs text-subtle">
          {data?.items.length ? (
            "Nothing renews in the next 30 days."
          ) : (
            <>
              No subscriptions tracked yet.{" "}
              <Link href="/subscriptions" className="text-fg underline-offset-2 hover:underline">
                Add one
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((s) => (
            <li key={s.id}>
              <Link href="/subscriptions" className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
                <span className="w-12 shrink-0 font-mono text-xs text-muted tabular">{formatDayMonth(s.nextRenewal)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{s.name}</span>
                <span className="font-mono text-xs text-muted tabular">
                  {(s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: s.currency })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const INBOX_PREVIEW = 3;

/** Quick capture + the newest open notes. */
function InboxPanel() {
  const { data } = useNotes("open");
  const preview = data?.items.slice(0, INBOX_PREVIEW) ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Inbox"
        meta={data ? `${data.counts.open} open` : null}
        actions={
          <Link href="/inbox" className="text-xs text-subtle transition-colors hover:text-fg">
            Open inbox
          </Link>
        }
      />
      <div className="p-3">
        <CaptureField compact rows={2} />
      </div>
      {preview.length ? (
        <ul className="divide-y divide-line border-t">
          {preview.map((n) => (
            <li key={n.id}>
              <Link href={`/inbox?note=${n.id}`} className="flex items-baseline gap-3 px-4 py-2 transition-colors hover:bg-hover">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{n.body.split("\n")[0]}</span>
                <span className="shrink-0 font-mono text-2xs text-subtle tabular">{formatRelative(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/** Routines due today or overdue – tick them off right here. */
function TodayPanel() {
  const { data, isPending } = useRoutines();
  const due = (data?.items ?? []).filter((r) => r.bucket === "overdue" || r.bucket === "today");
  const next = (data?.items ?? []).find((r) => r.bucket === "week");

  if (isPending || !data?.items.length) return null;

  return (
    <Panel>
      <PanelHeader
        title="Today"
        meta={due.length ? `${due.length} routine${due.length === 1 ? "" : "s"} due` : "All routines done"}
        actions={
          <Link href="/routines" className="text-xs text-subtle transition-colors hover:text-fg">
            All routines
          </Link>
        }
      />
      {due.length ? (
        <ul className="divide-y divide-line">
          {due.map((r) => (
            <RoutineRow key={r.id} routine={r} compact />
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 px-4 py-3 text-xs text-subtle">
          <CalendarCheck className="size-3.5" />
          Nothing due.{next ? ` Next: ${next.title} ${dueLabel(next)}.` : ""}
        </p>
      )}
    </Panel>
  );
}
