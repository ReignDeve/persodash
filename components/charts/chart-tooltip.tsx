import type { ReactNode } from "react";

/** Shared tooltip body for Recharts – rendered in our own tokens, not Recharts' defaults. */
export function ChartTooltip({
  title,
  rows,
}: {
  title: ReactNode;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="min-w-32 rounded-md bg-overlay px-2.5 py-2 text-xs shadow-[var(--shadow-overlay)]">
      <div className="mb-1 text-subtle">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            {r.color ? <span className="size-2 rounded-[2px]" style={{ background: r.color }} /> : null}
            {r.label}
          </span>
          <span className="font-mono text-fg tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
