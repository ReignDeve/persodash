"use client";

import { Plus, Workflow, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { ErrorState, SkeletonRows } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import { FlowEditor } from "@/features/actions/flow-editor";
import { MethodLabel, RequestEditor } from "@/features/actions/request-editor";
import { useActions } from "@/lib/api/queries";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Selection = { kind: "new" } | { kind: "action"; id: string } | { kind: "flow"; id: string | null };

/**
 * Two panes: saved actions & flows on the left, the request playground or the
 * flow editor on the right. The selection lives in the URL so links work.
 */
export function ActionsView() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, isPending, error, refetch } = useActions();
  const [newFlow, setNewFlow] = useState(false);

  const actionId = params.get("action");
  const flowId = params.get("flow");
  const selection: Selection = actionId
    ? { kind: "action", id: actionId }
    : flowId || newFlow
      ? { kind: "flow", id: flowId }
      : { kind: "new" };

  const select = (query: string | null) => {
    setNewFlow(false);
    router.replace(query ? `/actions?${query}` : "/actions", { scroll: false });
  };

  if (error) {
    return (
      <Page>
        <PageHeader title="Actions" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  const action = selection.kind === "action" ? (data?.actions.find((a) => a.id === selection.id) ?? null) : null;
  const flow = selection.kind === "flow" && selection.id ? (data?.flows.find((f) => f.id === selection.id) ?? null) : null;

  const rowClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
      active ? "bg-selected text-fg" : "text-muted hover:bg-hover hover:text-fg",
    );

  return (
    <Page>
      <PageHeader
        title="Actions"
        description="Try your own APIs and services from the server, save the calls you need often and chain them into flows."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => { router.replace("/actions", { scroll: false }); setNewFlow(true); }}>
              <Workflow />
              New flow
            </Button>
            <Button variant="primary" size="sm" onClick={() => select(null)}>
              <Plus />
              New request
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Panel className="lg:sticky lg:top-[calc(var(--topbar-height)+1.25rem)]">
          {isPending ? (
            <SkeletonRows rows={4} />
          ) : (
            <nav aria-label="Saved actions" className="flex flex-col gap-3 p-2">
              <button type="button" onClick={() => select(null)} className={rowClass(selection.kind === "new")}>
                <Plus className="size-3.5 shrink-0" />
                New request
              </button>

              {data?.flows.length ? (
                <div>
                  <div className="label px-2.5 pb-1">Flows</div>
                  {data.flows.map((f) => (
                    <button key={f.id} type="button" onClick={() => select(`flow=${f.id}`)} className={rowClass(selection.kind === "flow" && selection.id === f.id)}>
                      <Workflow className="size-3.5 shrink-0 text-subtle" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      {f.lastRun ? <StatusDot tone={f.lastRun.ok ? "ok" : "err"} /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <div className="label px-2.5 pb-1">Actions</div>
                {data?.actions.length ? (
                  data.actions.map((a) => (
                    <button key={a.id} type="button" onClick={() => select(`action=${a.id}`)} className={rowClass(selection.kind === "action" && selection.id === a.id)}>
                      <MethodLabel method={a.method} className="w-10 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      {a.lastRun ? (
                        <span className="flex shrink-0 items-center gap-1.5 font-mono text-2xs text-subtle" title={`Last run ${formatRelative(a.lastRun.startedAt)}`}>
                          <StatusDot tone={a.lastRun.ok ? "ok" : "err"} />
                        </span>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="flex items-start gap-2 px-2.5 py-1 text-xs text-subtle">
                    <Zap className="mt-0.5 size-3.5 shrink-0" />
                    Send a request and save it – e.g. “Server status”, “Dev DB health”, “Trigger backup”.
                  </p>
                )}
              </div>
            </nav>
          )}
        </Panel>

        <div className="min-w-0">
          {isPending || !data ? null : selection.kind === "flow" ? (
            <FlowEditor
              key={flow?.id ?? "new-flow"}
              flow={flow}
              actions={data.actions}
              onSaved={(id) => select(`flow=${id}`)}
              onDeleted={() => select(null)}
            />
          ) : (
            <RequestEditor
              // Re-mount per selection so the draft starts from the saved action.
              key={action?.id ?? "new"}
              action={action}
              secretsConfigured={data.secretsConfigured}
              onSaved={(id) => select(`action=${id}`)}
              onDeleted={() => select(null)}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
