"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { api } from "@/lib/api/client";
import { queryKeys, useTokens } from "@/lib/api/queries";
import { copyToClipboard } from "@/lib/hooks/use-copy";
import { formatRelative } from "@/lib/format";
import { SCOPE_INFO, TOKEN_SCOPES, type TokenItem, type TokenScope } from "@/lib/schemas/automation";

/** API tokens let LUCY, iOS Shortcuts and scripts talk to PersoDash. */
export function TokensSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useTokens();
  const [creating, setCreating] = useState(false);

  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/settings/tokens/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Token revoked");
      void queryClient.invalidateQueries({ queryKey: queryKeys.tokens });
    },
  });

  return (
    <div className="flex flex-col gap-3">
      {isPending ? (
        <Skeleton className="h-16" />
      ) : data?.tokens.length ? (
        <ul className="divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
          {data.tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <KeyRound className="size-4 shrink-0 text-subtle" strokeWidth={1.6} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm text-fg">{t.name}</span>
                  <span className="font-mono text-2xs text-faint">{t.prefix}…</span>
                </div>
                <div className="truncate text-2xs text-subtle">
                  {t.scopes.map((s) => SCOPE_INFO[s].label).join(" · ")} ·{" "}
                  {t.lastUsedAt ? `used ${formatRelative(t.lastUsedAt)}` : "never used"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => revoke.mutate(t.id)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-subtle">No tokens yet. Create one for LUCY, an iOS Shortcut or a script.</p>
      )}
      <Button size="sm" className="self-start" onClick={() => setCreating(true)}>
        <Plus />
        Create token
      </Button>

      <Dialog open={creating} onOpenChange={setCreating}>
        {creating ? <CreateTokenDialog onClose={() => setCreating(false)} /> : null}
      </Dialog>
    </div>
  );
}

function CreateTokenDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<TokenScope[]>(["read", "notes"]);
  const [created, setCreated] = useState<{ token: string; item: TokenItem } | null>(null);

  const create = useMutation({
    mutationFn: () => api<{ token: string; item: TokenItem }>("/api/settings/tokens", { method: "POST", body: { name, scopes } }),
    onSuccess: (res) => {
      setCreated(res);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tokens });
    },
  });

  const toggle = (scope: TokenScope) =>
    setScopes((s) => (s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]));

  if (created) {
    return (
      <DialogContent
        title="Token created"
        description="Copy it now – it is stored only as a hash and can't be shown again."
        className="sm:max-w-xl"
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2 shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{created.token}</code>
          <Button variant="ghost" size="icon-sm" aria-label="Copy token" onClick={() => copyToClipboard(created.token, "Token copied")}>
            <Copy />
          </Button>
        </div>
        <UsageExamples token={created.token} scopes={created.item.scopes} />
      </DialogContent>
    );
  }

  return (
    <DialogContent
      title="Create API token"
      description="Give each client its own token so you can revoke it independently."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || !scopes.length || create.isPending}
            onClick={() => create.mutate()}
          >
            Create token
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="token-name">
          <Input id="token-name" autoFocus placeholder="e.g. LUCY, iPhone Shortcuts" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1.5 text-xs font-medium text-muted">Permissions</legend>
          {TOKEN_SCOPES.map((scope) => (
            <label key={scope} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-hover">
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggle(scope)}
                className="mt-0.5 size-3.5 accent-[var(--fg)]"
              />
              <span>
                <span className="block text-sm text-fg">{SCOPE_INFO[scope].label}</span>
                <span className="block font-mono text-2xs text-subtle">{SCOPE_INFO[scope].description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </DialogContent>
  );
}

function UsageExamples({ token, scopes }: { token: string; scopes: TokenScope[] }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const auth = `-H "Authorization: Bearer ${token}"`;
  const json = `-H "Content-Type: application/json"`;

  const examples: { title: string; code: string }[] = [];
  if (scopes.includes("read")) {
    examples.push({ title: "Status for LUCY", code: `curl ${auth} ${origin}/api/automation/summary` });
  }
  if (scopes.includes("notes")) {
    examples.push({
      title: "Capture a note",
      code: `curl -X POST ${auth} ${json} \\\n  -d '{"text":"Idea: …","project":"enquso"}' ${origin}/api/automation/notes`,
    });
  }
  if (scopes.includes("trips")) {
    examples.push({
      title: "Log a trip (distance taken from the last trip of that name)",
      code: `curl -X POST ${auth} ${json} \\\n  -d '{"description":"Arbeit"}' ${origin}/api/automation/trips`,
    });
  }
  if (scopes.includes("notifications")) {
    examples.push({
      title: "Send an alert",
      code: `curl -X POST ${auth} ${json} \\\n  -d '{"title":"Backup failed","message":"…","severity":"error"}' ${origin}/api/automation/notifications`,
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {examples.map((e) => (
        <div key={e.title}>
          <div className="mb-1 flex items-center justify-between">
            <span className="label">{e.title}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(e.code.replace("\\\n  ", ""), "Command copied")}
              className="text-2xs text-subtle hover:text-fg"
            >
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-bg px-3 py-2 font-mono text-2xs leading-relaxed text-muted shadow-[inset_0_0_0_1px_var(--line)]">
            {e.code}
          </pre>
        </div>
      ))}
      <p className="text-xs text-subtle">
        iOS Shortcuts: use “Get Contents of URL” with method POST, the header{" "}
        <span className="font-mono text-2xs">Authorization: Bearer …</span> and a JSON body. Add it to Siri, e.g. “Log trip
        to work”.
      </p>
    </div>
  );
}
