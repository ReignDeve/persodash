"use client";

import { Lock, LockOpen, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import type { HeaderItem } from "@/lib/schemas/actions";
import { cn } from "@/lib/utils";

export type DraftHeader = HeaderItem;

/**
 * Key/value rows. Secret headers are encrypted on the server and never sent
 * back – a stored secret shows as "stored" until you type a new value.
 */
export function HeadersEditor({
  headers,
  onChange,
  secretsConfigured,
}: {
  headers: DraftHeader[];
  onChange: (headers: DraftHeader[]) => void;
  secretsConfigured: boolean;
}) {
  const update = (i: number, patch: Partial<DraftHeader>) =>
    onChange(headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      {headers.map((h, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={h.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="Header"
            aria-label="Header name"
            spellCheck={false}
            className="h-7 w-40 shrink-0 font-mono text-xs sm:w-56"
          />
          <Input
            type={h.secret ? "password" : "text"}
            value={h.value ?? ""}
            onChange={(e) => update(i, { value: e.target.value, hasValue: Boolean(e.target.value) })}
            placeholder={h.secret && h.hasValue ? "•••••• stored – type to replace" : "Value"}
            aria-label="Header value"
            spellCheck={false}
            autoComplete="off"
            className="h-7 min-w-0 flex-1 font-mono text-xs"
          />
          <Tooltip
            content={
              !secretsConfigured
                ? "Set SECRETS_KEY to store encrypted values"
                : h.secret
                  ? "Secret – encrypted, never shown again"
                  : "Mark as secret"
            }
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={h.secret ? "Secret header" : "Mark as secret"}
              aria-pressed={h.secret}
              disabled={!secretsConfigured && !h.secret}
              onClick={() => update(i, { secret: !h.secret, value: h.secret ? h.value : (h.value ?? "") })}
              className={cn(h.secret && "text-accent")}
            >
              {h.secret ? <Lock /> : <LockOpen />}
            </Button>
          </Tooltip>
          <Button variant="ghost" size="icon-sm" aria-label="Remove header" onClick={() => onChange(headers.filter((_, idx) => idx !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => onChange([...headers, { key: "", value: "", secret: false, hasValue: false }])}
      >
        <Plus />
        Add header
      </Button>
    </div>
  );
}
