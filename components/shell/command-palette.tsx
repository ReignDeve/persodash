"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  CheckCheck,
  Download,
  FileText,
  FolderGit2,
  LogOut,
  Moon,
  RefreshCw,
  Repeat,
  Route,
  Search,
  StickyNote,
  Wallet,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useDeferredValue, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useAppActions } from "@/components/shell/app-actions";
import { ALL_NAV_ITEMS } from "@/components/shell/nav";
import { signOut } from "@/components/shell/user-menu";
import { Kbd } from "@/components/ui/kbd";
import { api } from "@/lib/api/client";
import { queryKeys, useActions, useSearch } from "@/lib/api/queries";
import type { ExecutionResult, FlowRunResult } from "@/lib/schemas/actions";
import { SEARCH_GROUPS } from "@/lib/schemas/overview";
import { cn } from "@/lib/utils";

/** Global command palette (⌘K): navigate, search all data, run actions. */
export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useAppActions();

  return (
    <DialogPrimitive.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-3 top-3 z-[var(--z-overlay)] overflow-hidden rounded-lg bg-raised shadow-[var(--shadow-overlay)]",
            "sm:inset-x-auto sm:top-[16vh] sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2",
            "data-[state=open]:animate-pop-in focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          {commandOpen ? <Palette close={() => setCommandOpen(false)} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Palette({ close }: { close: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { openTripDialog, setWalletDialogOpen, openEditor, openCapture } = useAppActions();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const { data, isFetching } = useSearch(deferred);
  const actions = useActions();

  const runAction = async (id: string, name: string) => {
    const t = toast.loading(`Running ${name}…`);
    try {
      const r = await api<ExecutionResult>(`/api/actions/${id}/run`, { method: "POST" });
      toast[r.ok ? "success" : "error"](`${name} · ${r.status ?? r.error} · ${r.durationMs} ms`, { id: t });
    } catch (error) {
      toast.error(`${name} failed: ${(error as Error).message}`, { id: t });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.actions });
  };

  const runFlow = async (id: string, name: string) => {
    const t = toast.loading(`Running ${name}…`);
    try {
      const r = await api<FlowRunResult>(`/api/actions/flows/${id}/run`, { method: "POST" });
      const passed = r.steps.filter((s) => s.result?.ok).length;
      toast[r.ok ? "success" : "error"](`${name} · ${passed}/${r.steps.length} steps ok`, { id: t });
    } catch (error) {
      toast.error(`${name} failed: ${(error as Error).message}`, { id: t });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.actions });
  };

  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  const results = deferred.trim().length >= 2 ? (data?.results ?? []) : [];

  return (
    <Command loop className="flex max-h-[70dvh] flex-col">
      <div className="flex h-12 items-center gap-3 border-b px-4">
        <Search className="size-4 shrink-0 text-subtle" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search trips, websites, wallets – or type a command"
          className="h-full flex-1 bg-transparent text-base text-fg outline-none placeholder:text-faint"
        />
        {isFetching ? <span className="size-3 animate-spin rounded-full border border-line-strong border-t-fg" /> : null}
        <Kbd className="hidden sm:inline-flex">Esc</Kbd>
      </div>

      <Command.List className="flex-1 overflow-y-auto p-1.5 [&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1">
        <Command.Empty className="px-3 py-8 text-center text-sm text-subtle">
          {deferred.trim().length >= 2 && isFetching ? "Searching…" : "No results"}
        </Command.Empty>

        {query.trim() ? (
          <Command.Group heading="Capture">
            <Item
              value={`capture ${query}`}
              keywords={[query]}
              icon={StickyNote}
              shortcut="↵"
              onSelect={run(() => openCapture(query.trim()))}
            >
              Capture “{query.trim().slice(0, 60)}”
            </Item>
          </Command.Group>
        ) : null}

        {SEARCH_GROUPS.map((group) => {
          const items = results.filter((r) => r.group === group);
          if (!items.length) return null;
          return (
            <Command.Group key={group} heading={group}>
              {items.map((r) => (
                <Item
                  key={r.id}
                  // Keep server results visible regardless of cmdk's local filter.
                  value={`${r.id} ${r.title} ${r.subtitle ?? ""}`}
                  keywords={[deferred]}
                  icon={r.external ? ArrowUpRight : FileText}
                  onSelect={run(() =>
                    r.external ? window.open(r.href, "_blank", "noopener,noreferrer") : router.push(r.href),
                  )}
                  hint={r.subtitle}
                >
                  {r.title}
                </Item>
              ))}
            </Command.Group>
          );
        })}

        {actions.data?.actions.length || actions.data?.flows.length ? (
          <Command.Group heading="Run">
            {actions.data.flows.map((f) => (
              <Item key={f.id} value={`run flow ${f.name}`} icon={Workflow} hint={`${f.steps.length} steps`} onSelect={run(() => runFlow(f.id, f.name))}>
                Run {f.name}
              </Item>
            ))}
            {actions.data.actions.map((a) => (
              <Item key={a.id} value={`run action ${a.name} ${a.url}`} icon={Zap} hint={a.method} onSelect={run(() => runAction(a.id, a.name))}>
                Run {a.name}
              </Item>
            ))}
          </Command.Group>
        ) : null}

        <Command.Group heading="Go to">
          {ALL_NAV_ITEMS.map((item) => (
            <Item
              key={item.href}
              value={`go ${item.label} ${item.description}`}
              icon={item.icon}
              shortcut={`G ${item.shortcut.toUpperCase()}`}
              onSelect={run(() => router.push(item.href))}
            >
              {item.label}
            </Item>
          ))}
        </Command.Group>

        <Command.Group heading="Actions">
          <Item value="capture note inbox new" icon={StickyNote} shortcut="N" onSelect={run(() => openCapture())}>
            Capture note
          </Item>
          <Item value="log trip new create" icon={Route} shortcut="C" onSelect={run(() => openTripDialog())}>
            Log trip
          </Item>
          <Item
            value="new routine recurring task create"
            icon={CalendarCheck}
            onSelect={run(() => openEditor({ kind: "routine", item: null }))}
          >
            New routine
          </Item>
          <Item value="new project create" icon={FolderGit2} onSelect={run(() => openEditor({ kind: "project", item: null }))}>
            New project
          </Item>
          <Item
            value="monitor service uptime add create"
            icon={Activity}
            onSelect={run(() => openEditor({ kind: "monitor", item: null }))}
          >
            Monitor a service
          </Item>
          <Item
            value="add subscription abo cost create"
            icon={Repeat}
            onSelect={run(() => openEditor({ kind: "subscription", item: null }))}
          >
            Add subscription
          </Item>
          <Item value="add wallet new create" icon={Wallet} onSelect={run(() => setWalletDialogOpen(true))}>
            Add wallet
          </Item>
          <Item
            value="mark all notifications read"
            icon={CheckCheck}
            onSelect={run(async () => {
              await api("/api/notifications", { method: "PATCH", body: { action: "read-all" } });
              await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
              toast.success("All notifications marked as read");
            })}
          >
            Mark all notifications as read
          </Item>
          <Item
            value="export logbook csv download"
            icon={Download}
            onSelect={run(() => window.location.assign("/api/logbook/export"))}
          >
            Export logbook as CSV
          </Item>
          <Item
            value="refresh reload data"
            icon={RefreshCw}
            onSelect={run(async () => {
              await queryClient.invalidateQueries();
              toast.success("Data refreshed");
            })}
          >
            Refresh all data
          </Item>
          <Item
            value="toggle theme dark light"
            icon={Moon}
            onSelect={run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
          </Item>
          <Item value="sign out logout" icon={LogOut} onSelect={run(signOut)}>
            Sign out
          </Item>
        </Command.Group>
      </Command.List>

      <div className="hidden h-9 items-center gap-4 border-t px-4 text-2xs text-subtle sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> open
        </span>
      </div>
    </Command>
  );
}

function Item({
  value,
  keywords,
  icon: Icon,
  shortcut,
  hint,
  onSelect,
  children,
}: {
  value: string;
  keywords?: string[];
  icon: LucideIcon;
  shortcut?: string;
  hint?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="flex h-9 cursor-default items-center gap-3 rounded-md px-2.5 text-sm text-muted data-[selected=true]:bg-selected data-[selected=true]:text-fg"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.6} />
      <span className="truncate">{children}</span>
      {hint ? <span className="truncate text-xs text-subtle">{hint}</span> : null}
      {shortcut ? <span className="ml-auto font-mono text-2xs text-faint">{shortcut}</span> : null}
    </Command.Item>
  );
}
