"use client";

import { ExternalLink, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
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
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { queryKeys, useSubscriptions } from "@/lib/api/queries";
import { renewalLabel } from "@/features/subscriptions/format";
import { useCrud } from "@/lib/hooks/use-crud";
import { formatDayMonth, formatEur } from "@/lib/format";
import { CYCLE_LABEL, type SubscriptionFormValues, type SubscriptionItem } from "@/lib/schemas/subscriptions";
import { cn } from "@/lib/utils";

function price(s: SubscriptionItem) {
  return (s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: s.currency });
}

/** Request body for an update; `amount` is in major units (the service converts to cents). */
function toInput(s: SubscriptionItem, patch: Partial<SubscriptionFormValues> = {}): SubscriptionFormValues {
  return {
    name: s.name,
    amount: s.amountCents / 100,
    currency: s.currency,
    cycle: s.cycle,
    nextRenewal: s.nextRenewal,
    category: s.category,
    remindDays: s.remindDays,
    url: s.url,
    projectId: s.project?.id ?? null,
    active: s.active,
    ...patch,
  };
}

export function SubscriptionsView() {
  const { openEditor } = useAppActions();
  const { data, isPending, error, refetch } = useSubscriptions();
  const { save, remove } = useCrud<SubscriptionFormValues>({
    endpoint: "/api/subscriptions",
    noun: "Subscription",
    invalidate: [queryKeys.subscriptions, queryKeys.projects],
  });

  const items = data?.items ?? [];
  const activeCount = items.filter((i) => i.active).length;
  const totals = data?.totals;
  const maxCategory = Math.max(...(totals?.byCategory.map((c) => c.monthlyEur) ?? [0]), 1);

  if (error) {
    return (
      <Page>
        <PageHeader title="Subscriptions" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  const addButton = (
    <Button variant="primary" size="sm" onClick={() => openEditor({ kind: "subscription", item: null })}>
      <Plus />
      Add subscription
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Subscriptions"
        description="Recurring costs, with a reminder before anything renews."
        actions={addButton}
      />

      <MetricStrip className="mb-4">
        <Metric label="Per month" loading={isPending} value={formatEur(totals?.monthlyEur ?? 0)} meta="All active, normalised" />
        <Metric label="Per year" loading={isPending} value={formatEur(totals?.yearlyEur ?? 0, { compact: true })} meta="At current prices" />
        <Metric
          label="Next 30 days"
          loading={isPending}
          value={formatEur(totals?.next30DaysEur ?? 0)}
          meta={`${items.filter((i) => i.active && i.daysUntilRenewal <= 30).length} renewals due`}
        />
        <Metric label="Active" loading={isPending} value={activeCount} meta={`${items.length - activeCount} paused`} />
      </MetricStrip>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader title="All subscriptions" meta="Sorted by next renewal" />
          {isPending ? (
            <SkeletonRows rows={5} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No subscriptions yet"
              description="Add your VPS, domains and tools – PersoDash reminds you before each renewal so nothing renews unnoticed."
              action={addButton}
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th className="hidden text-right sm:table-cell">Price</Th>
                  <Th className="text-right">Monthly</Th>
                  <Th className="text-right">Renews</Th>
                  <Th className="w-10">
                    <span className="sr-only">Actions</span>
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {items.map((s) => {
                  const due = s.active && s.remindDays > 0 && s.daysUntilRenewal <= s.remindDays;
                  return (
                    <Tr key={s.id} className={cn(!s.active && "opacity-50")} onDoubleClick={() => openEditor({ kind: "subscription", item: s })}>
                      <Td className="max-w-0">
                        <div className="truncate text-fg">{s.name}</div>
                        <div className="truncate text-xs text-subtle">
                          {[s.category, s.project?.name, s.active ? null : "paused"].filter(Boolean).join(" · ")}
                        </div>
                      </Td>
                      <Td className="hidden text-right whitespace-nowrap sm:table-cell">
                        <span className="font-mono text-sm tabular">{price(s)}</span>
                        <span className="ml-1 text-xs text-subtle">/ {CYCLE_LABEL[s.cycle].toLowerCase()}</span>
                      </Td>
                      <Td className="text-right font-mono text-sm text-fg tabular">{formatEur(s.monthlyEur)}</Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {due ? <StatusDot tone={s.daysUntilRenewal <= 2 ? "warn" : "info"} /> : null}
                          <span className="font-mono text-xs text-muted tabular">{formatDayMonth(s.nextRenewal)}</span>
                        </div>
                        <div className={cn("text-2xs", due ? "text-fg" : "text-subtle")}>{renewalLabel(s.daysUntilRenewal)}</div>
                      </Td>
                      <Td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem icon={<Pencil />} onSelect={() => openEditor({ kind: "subscription", item: s })}>
                              Edit
                            </DropdownMenuItem>
                            {s.url ? (
                              <DropdownMenuItem
                                icon={<ExternalLink />}
                                onSelect={() => window.open(s.url!, "_blank", "noopener,noreferrer")}
                              >
                                Manage
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              icon={s.active ? <Pause /> : <Play />}
                              onSelect={() => save.mutate({ id: s.id, input: toInput(s, { active: !s.active }) })}
                            >
                              {s.active ? "Mark as cancelled" : "Reactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate(s.id)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Panel>

        <Panel className="self-start lg:col-span-4">
          <PanelHeader title="By category" meta="per month" />
          {totals?.byCategory.length ? (
            <ul className="divide-y divide-line">
              {totals.byCategory.map((c) => (
                <li key={c.category} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-fg">{c.category}</span>
                    <span className="font-mono text-xs text-muted tabular">{formatEur(c.monthlyEur)}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-hover">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.monthlyEur / maxCategory) * 100}%`, background: "var(--chart-1)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-xs text-subtle">{isPending ? "" : "Nothing to break down yet."}</p>
          )}
          {data?.usdToEur ? (
            <p className="border-t px-4 py-2.5 font-mono text-2xs text-faint">USD → EUR at {data.usdToEur.toFixed(4)}</p>
          ) : null}
        </Panel>
      </div>
    </Page>
  );
}
