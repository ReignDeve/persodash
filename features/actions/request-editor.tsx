"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Play, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Panel } from "@/components/ui/panel";
import { ProjectSelect } from "@/components/ui/project-select";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import { HeadersEditor, type DraftHeader } from "@/features/actions/headers-editor";
import { ResponseView } from "@/features/actions/response-view";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import { formatDateTime } from "@/lib/format";
import {
  HTTP_METHODS,
  type ActionItem,
  type ExecutionResult,
  type HttpMethod,
} from "@/lib/schemas/actions";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  method: HttpMethod;
  url: string;
  headers: DraftHeader[];
  body: string;
  expectedStatus: string;
  projectId: string;
};

function toDraft(a: ActionItem | null): Draft {
  return {
    name: a?.name ?? "",
    method: a?.method ?? "GET",
    url: a?.url ?? "",
    headers: a?.headers ?? [],
    body: a?.body ?? "",
    expectedStatus: a?.expectedStatus ? String(a.expectedStatus) : "",
    projectId: a?.project?.id ?? "",
  };
}

/** Headers as sent to the API: an untouched stored secret goes out as `null` ("keep"). */
const outgoingHeaders = (headers: DraftHeader[]) =>
  headers.map((h) => ({ key: h.key, secret: h.secret, value: h.secret && !h.value ? null : h.value }));

const METHOD_TINT: Record<HttpMethod, string> = {
  GET: "text-ok",
  POST: "text-info",
  PUT: "text-warn",
  PATCH: "text-warn",
  DELETE: "text-err",
  HEAD: "text-muted",
};

export function MethodLabel({ method, className }: { method: HttpMethod; className?: string }) {
  return <span className={cn("font-mono text-2xs font-medium", METHOD_TINT[method], className)}>{method}</span>;
}

/** Playground + editor for one saved action (or a new, unsaved request). */
export function RequestEditor({
  action,
  secretsConfigured,
  onSaved,
  onDeleted,
}: {
  action: ActionItem | null;
  secretsConfigured: boolean;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(action));
  const [tab, setTab] = useState<"headers" | "body" | "history">(action?.body ? "body" : "headers");
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(action)), [draft, action]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.actions });

  const send = useMutation({
    // Saved & unchanged → a real run (recorded in history); otherwise a dry try of the draft.
    mutationFn: () =>
      action && !dirty
        ? api<ExecutionResult>(`/api/actions/${action.id}/run`, { method: "POST" })
        : api<ExecutionResult>("/api/actions/try", {
            method: "POST",
            body: {
              actionId: action?.id,
              method: draft.method,
              url: draft.url,
              headers: outgoingHeaders(draft.headers),
              body: draft.body || null,
              expectedStatus: draft.expectedStatus || null,
            },
          }),
    onSuccess: (r) => {
      setResult(r);
      if (action && !dirty) void refresh();
    },
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name.trim() || draft.url.replace(/^https?:\/\//, "").slice(0, 60),
        method: draft.method,
        url: draft.url,
        headers: outgoingHeaders(draft.headers),
        body: draft.body || null,
        expectedStatus: draft.expectedStatus || null,
        projectId: draft.projectId || null,
      };
      return action
        ? api<ActionItem>(`/api/actions/${action.id}`, { method: "PATCH", body })
        : api<ActionItem>("/api/actions", { method: "POST", body });
    },
    onSuccess: (saved) => {
      toast.success(action ? "Action saved" : "Saved as action");
      void refresh();
      onSaved(saved.id);
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/actions/${action!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Action deleted");
      void refresh();
      onDeleted();
    },
  });

  const canSend = /^https?:\/\/\S+$/.test(draft.url) && !send.isPending;

  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
          e.preventDefault();
          send.mutate();
        }
      }}
    >
      <Panel>
        {/* Name + meta */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={action ? "Action name" : "Untitled request"}
            aria-label="Action name"
            className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none hover:shadow-none focus-visible:shadow-none"
          />
          <div className="w-40">
            <ProjectSelect value={draft.projectId} onChange={(v) => set("projectId", v)} />
          </div>
          <Button size="sm" onClick={() => save.mutate()} disabled={!draft.url || save.isPending || (Boolean(action) && !dirty)}>
            <Save />
            {action ? "Save" : "Save as action"}
          </Button>
          {action ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate()}>
                  Delete action
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {/* Request line */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Select
            aria-label="Method"
            value={draft.method}
            onValueChange={(v) => set("method", v as HttpMethod)}
            options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
            className="w-28 shrink-0 font-mono text-xs"
          />
          <Input
            value={draft.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://api.example.com/health  ·  http://localhost:8080/status"
            aria-label="URL"
            spellCheck={false}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <Button variant="primary" onClick={() => send.mutate()} disabled={!canSend}>
            <Play />
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
          <Segmented
            aria-label="Request section"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: "headers", label: "Headers", count: draft.headers.length },
              { value: "body", label: "Body" },
              ...(action ? [{ value: "history" as const, label: "History", count: action.recentRuns.length }] : []),
            ]}
          />
          <label className="ml-auto flex items-center gap-2 text-xs text-subtle">
            Expect status
            <Input
              value={draft.expectedStatus}
              onChange={(e) => set("expectedStatus", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="any"
              inputMode="numeric"
              aria-label="Expected status"
              className="h-7 w-16 font-mono text-xs"
            />
          </label>
          <span className="hidden items-center gap-1 text-2xs text-subtle md:flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd> send
          </span>
        </div>

        <div className="border-t">
          {tab === "headers" ? (
            <HeadersEditor headers={draft.headers} onChange={(h) => set("headers", h)} secretsConfigured={secretsConfigured} />
          ) : tab === "body" ? (
            <div className="px-4 py-3">
              <Textarea
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
                rows={8}
                placeholder={draft.method === "GET" || draft.method === "HEAD" ? "GET and HEAD requests are sent without a body" : '{ "key": "value" }'}
                aria-label="Request body"
                spellCheck={false}
                className="font-mono text-xs"
              />
            </div>
          ) : action?.recentRuns.length ? (
            <ul className="divide-y divide-line">
              {[...action.recentRuns].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                  <StatusDot tone={r.ok ? "ok" : "err"} />
                  <span className="font-mono text-muted tabular">{formatDateTime(r.startedAt)}</span>
                  <span className="font-mono text-fg tabular">{r.status ?? "—"}</span>
                  <span className="font-mono text-muted tabular">{r.durationMs ?? "–"} ms</span>
                  <span className="truncate text-subtle">{r.error ?? ""}</span>
                  <span className="ml-auto shrink-0 text-subtle">{r.trigger}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-xs text-subtle">No runs yet. Saved actions record every run – from here, flows, ⌘K and the API.</p>
          )}
        </div>
      </Panel>

      <Panel>
        {result ? (
          <ResponseView result={result} />
        ) : (
          <EmptyState
            title="No response yet"
            description="Requests run from your server, so internal addresses like localhost or Docker service names work too."
            className="py-8"
          />
        )}
      </Panel>
      {dirty && action ? <p className="-mt-2 text-2xs text-subtle">Unsaved changes – Send tries the draft without recording it.</p> : null}
    </div>
  );
}
