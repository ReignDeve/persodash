"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Status } from "@/components/ui/status";
import { copyToClipboard } from "@/lib/hooks/use-copy";
import { formatBytes } from "@/lib/format";
import type { ExecutionResult } from "@/lib/schemas/actions";

/** Status line + body/headers of an executed request. */
export function ResponseView({ result }: { result: ExecutionResult }) {
  const [tab, setTab] = useState<"body" | "headers">("body");

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5">
        <Status tone={result.ok ? "ok" : "err"} label={result.status ? `${result.status} ${result.statusText ?? ""}`.trim() : "Failed"} />
        <span className="font-mono text-xs text-muted tabular">{result.durationMs} ms</span>
        {result.size !== null ? <span className="font-mono text-xs text-muted tabular">{formatBytes(result.size)}</span> : null}
        {result.contentType ? <span className="hidden truncate font-mono text-2xs text-subtle sm:inline">{result.contentType.split(";")[0]}</span> : null}
        <div className="ml-auto flex items-center gap-1">
          <Segmented
            aria-label="Response view"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: "body", label: "Body" },
              { value: "headers", label: "Headers", count: result.headers.length },
            ]}
          />
          {result.body ? (
            <Button variant="ghost" size="icon-sm" aria-label="Copy response" onClick={() => copyToClipboard(result.body!, "Response copied")}>
              <Copy />
            </Button>
          ) : null}
        </div>
      </div>

      {result.error && !result.status ? (
        <p className="px-4 py-3 font-mono text-xs text-err">{result.error}</p>
      ) : tab === "body" ? (
        <pre className="max-h-[50vh] min-h-24 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-muted">
          {result.body ?? <span className="text-faint">Empty response</span>}
          {result.truncated ? <span className="text-warn">{"\n\n"}… truncated at 200 KB</span> : null}
        </pre>
      ) : (
        <dl className="max-h-[50vh] overflow-auto px-4 py-2 font-mono text-xs">
          {result.headers.map(([k, v]) => (
            <div key={k} className="flex gap-3 py-1">
              <dt className="w-48 shrink-0 truncate text-subtle">{k}</dt>
              <dd className="min-w-0 break-all text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
