"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, MoreHorizontal, Play, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/menu";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { Status, StatusDot } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";
import { MethodLabel } from "@/features/actions/request-editor";
import { ResponseView } from "@/features/actions/response-view";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import type { ActionItem, FlowItem, FlowRunResult } from "@/lib/schemas/actions";

const ADD_PLACEHOLDER = "__add";

/** Combine saved actions into a sequence, e.g. "deploy check": health → db → smoke test. */
export function FlowEditor({
  flow,
  actions,
  onSaved,
  onDeleted,
}: {
  flow: FlowItem | null;
  actions: ActionItem[];
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(flow?.name ?? "");
  const [steps, setSteps] = useState<string[]>(flow?.steps.filter((s) => !s.missing).map((s) => s.id) ?? []);
  const [stopOnFailure, setStopOnFailure] = useState(flow?.stopOnFailure ?? true);
  const [result, setResult] = useState<FlowRunResult | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(null);

  const byId = new Map(actions.map((a) => [a.id, a]));
  const dirty =
    !flow ||
    name !== flow.name ||
    stopOnFailure !== flow.stopOnFailure ||
    JSON.stringify(steps) !== JSON.stringify(flow.steps.map((s) => s.id));
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.actions });

  const move = (i: number, delta: number) =>
    setSteps((s) => {
      const next = [...s];
      [next[i], next[i + delta]] = [next[i + delta], next[i]];
      return next;
    });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim() || "Untitled flow", steps, stopOnFailure };
      return flow
        ? api<{ id: string }>(`/api/actions/flows/${flow.id}`, { method: "PATCH", body })
        : api<{ id: string }>("/api/actions/flows", { method: "POST", body });
    },
    onSuccess: (saved) => {
      toast.success("Flow saved");
      void refresh();
      onSaved(saved.id);
    },
  });

  const run = useMutation({
    mutationFn: () => api<FlowRunResult>(`/api/actions/flows/${flow!.id}/run`, { method: "POST" }),
    onSuccess: (r) => {
      setResult(r);
      setOpenStep(r.steps.findIndex((s) => s.result && !s.result.ok));
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/actions/flows/${flow!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Flow deleted");
      void refresh();
      onDeleted();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flow name, e.g. Deploy check"
            aria-label="Flow name"
            className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none hover:shadow-none focus-visible:shadow-none"
          />
          <Button size="sm" onClick={() => save.mutate()} disabled={!steps.length || !dirty || save.isPending}>
            <Save />
            Save
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => run.mutate()}
            disabled={!flow || dirty || run.isPending}
            title={dirty ? "Save first" : undefined}
          >
            <Play />
            {run.isPending ? "Running…" : "Run flow"}
          </Button>
          {flow ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate()}>
                  Delete flow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {steps.length ? (
          <ol className="divide-y divide-line">
            {steps.map((id, i) => {
              const a = byId.get(id);
              return (
                <li key={`${id}-${i}`} className="flex items-center gap-3 px-4 py-2">
                  <span className="w-5 font-mono text-2xs text-subtle tabular">{i + 1}</span>
                  {a ? <MethodLabel method={a.method} className="w-12" /> : null}
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{a?.name ?? "Deleted action"}</span>
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove step" onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}>
                    <X />
                  </Button>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState title="No steps yet" description="Add saved actions below – they run top to bottom." className="py-8" />
        )}

        <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2.5">
          <Select
            aria-label="Add step"
            value={ADD_PLACEHOLDER}
            onValueChange={(v) => v !== ADD_PLACEHOLDER && setSteps((s) => [...s, v])}
            options={[{ value: ADD_PLACEHOLDER, label: "+ Add step" }, ...actions.map((a) => ({ value: a.id, label: `${a.method} · ${a.name}` }))]}
            className="w-64"
            size="sm"
          />
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Stop at first failure
            <Switch checked={stopOnFailure} onCheckedChange={setStopOnFailure} />
          </label>
        </div>
      </Panel>

      {result ? (
        <Panel>
          <PanelHeader
            title="Last run"
            meta={`${result.steps.filter((s) => s.result?.ok).length}/${result.steps.length} steps ok · ${result.durationMs} ms`}
            actions={<Status tone={result.ok ? "ok" : "err"} label={result.ok ? "Passed" : "Failed"} />}
          />
          <ul className="divide-y divide-line">
            {result.steps.map((s, i) => (
              <li key={`${s.actionId}-${i}`}>
                <button
                  type="button"
                  disabled={!s.result}
                  onClick={() => setOpenStep(openStep === i ? null : i)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-hover disabled:cursor-default"
                >
                  <StatusDot tone={s.skipped ? "idle" : s.result?.ok ? "ok" : "err"} />
                  <span className="min-w-0 flex-1 truncate text-fg">{s.name}</span>
                  <span className="font-mono text-xs text-muted tabular">
                    {s.skipped ? "skipped" : `${s.result?.status ?? "failed"} · ${s.result?.durationMs} ms`}
                  </span>
                </button>
                {openStep === i && s.result ? (
                  <div className="border-t bg-bg/40">
                    <ResponseView result={s.result} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
