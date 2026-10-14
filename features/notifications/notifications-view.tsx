"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Bell, CheckCheck, Circle, CircleDot, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { StatusDot, type Tone } from "@/components/ui/status";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api/client";
import { queryKeys, useNotifications } from "@/lib/api/queries";
import { formatTime } from "@/lib/format";
import {
  CATEGORY_LABEL,
  NOTIFICATION_CATEGORIES,
  type NotificationItem,
  type NotificationsResponse,
  type Severity,
} from "@/lib/schemas/notifications";
import { cn } from "@/lib/utils";

const SEVERITY_TONE: Record<Severity, Tone> = { info: "info", warning: "warn", error: "err" };

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM");
}

function useNotificationMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.notifications.all;

  const patchCache = (fn: (items: NotificationItem[]) => NotificationItem[]) =>
    queryClient.setQueriesData<NotificationsResponse>({ queryKey: key }, (old) => {
      if (!old) return old;
      const items = fn(old.items);
      return { items, unread: items.filter((i) => !i.read).length };
    });

  const settle = () => queryClient.invalidateQueries({ queryKey: key });

  const setRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      api(`/api/notifications/${id}`, { method: "PATCH", body: { read } }),
    onMutate: ({ id, read }) => patchCache((items) => items.map((i) => (i.id === id ? { ...i, read } : i))),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}`, { method: "DELETE" }),
    onMutate: (id) => patchCache((items) => items.filter((i) => i.id !== id)),
    onSettled: settle,
  });

  const bulk = useMutation({
    mutationFn: (action: "read-all" | "clear-read") =>
      api<{ updated?: number; deleted?: number }>("/api/notifications", { method: "PATCH", body: { action } }),
    onSuccess: (res, action) =>
      toast.success(action === "read-all" ? "All marked as read" : `Removed ${res.deleted ?? 0} read notifications`),
    onSettled: settle,
  });

  return { setRead, remove, bulk };
}

export function NotificationsView() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(params.get("id"));
  const { data, isPending, error, refetch } = useNotifications(status);
  const { setRead, remove, bulk } = useNotificationMutations();

  const items = useMemo(
    () => (data?.items ?? []).filter((n) => category === "all" || n.category === category),
    [data, category],
  );

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of items) {
      const label = dayLabel(n.createdAt);
      map.set(label, [...(map.get(label) ?? []), n]);
    }
    return [...map.entries()];
  }, [items]);

  useEffect(() => {
    const id = params.get("id");
    if (id) document.getElementById(`notification-${id}`)?.scrollIntoView({ block: "center" });
  }, [params, data]);

  const toggle = (n: NotificationItem) => {
    setExpanded((cur) => (cur === n.id ? null : n.id));
    if (!n.read) setRead.mutate({ id: n.id, read: true });
  };

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Notifications"
        description="Alerts from monitors and integrations. Forwarded to Telegram when enabled."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => bulk.mutate("clear-read")} disabled={bulk.isPending}>
              <Trash2 />
              <span className="hidden sm:inline">Clear read</span>
            </Button>
            <Button size="sm" onClick={() => bulk.mutate("read-all")} disabled={!data?.unread || bulk.isPending}>
              <CheckCheck />
              Mark all read
            </Button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Segmented
            aria-label="Status"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread", count: data?.unread },
            ]}
          />
          <Select
            size="sm"
            aria-label="Category"
            value={category}
            onValueChange={setCategory}
            className="w-32"
            options={[
              { value: "all", label: "All sources" },
              ...NOTIFICATION_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
            ]}
          />
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : isPending ? (
          <SkeletonRows rows={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={status === "unread" ? "You’re all caught up" : "No notifications"}
            description="Miner alerts, outages and system events will show up here."
          />
        ) : (
          groups.map(([label, group]) => (
            <section key={label} aria-label={label}>
              <h3 className="label border-b bg-bg/40 px-4 py-1.5">{label}</h3>
              <ul className="divide-y divide-line">
                {group.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    expanded={expanded === n.id}
                    onToggle={() => toggle(n)}
                    onToggleRead={() => setRead.mutate({ id: n.id, read: !n.read })}
                    onDelete={() => remove.mutate(n.id)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </Panel>
    </Page>
  );
}

function NotificationRow({
  item,
  expanded,
  onToggle,
  onToggleRead,
  onDelete,
}: {
  item: NotificationItem;
  expanded: boolean;
  onToggle: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  return (
    <li id={`notification-${item.id}`} className="group">
      <div className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
        <StatusDot tone={SEVERITY_TONE[item.severity]} className="mt-[7px]" />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
        >
          <div className="flex items-baseline gap-2">
            <span className={cn("truncate text-sm", item.read ? "text-muted" : "font-medium text-fg")}>
              {item.title}
            </span>
            {!item.read ? <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
            <span>{CATEGORY_LABEL[item.category]}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tabular">{formatTime(item.createdAt)}</span>
          </div>
          {expanded ? (
            <p className="mt-2 text-sm whitespace-pre-line text-muted">{item.message}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Tooltip content={item.read ? "Mark as unread" : "Mark as read"}>
            <Button variant="ghost" size="icon-sm" aria-label={item.read ? "Mark as unread" : "Mark as read"} onClick={onToggleRead}>
              {item.read ? <CircleDot /> : <Circle />}
            </Button>
          </Tooltip>
          <Tooltip content="Delete">
            <Button variant="ghost" size="icon-sm" aria-label="Delete notification" onClick={onDelete}>
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      </div>
    </li>
  );
}
