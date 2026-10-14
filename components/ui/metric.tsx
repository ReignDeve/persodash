import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

type MetricProps = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  loading?: boolean;
  /** Small inline visual next to the value (e.g. sparkline). */
  aside?: ReactNode;
  className?: string;
};

/**
 * Instrument-style readout:
 *   LABEL
 *   Value
 *   meta
 */
export function Metric({ label, value, meta, loading, aside, className }: MetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="label truncate">{label}</span>
      <div className="flex min-w-0 items-end justify-between gap-3">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="shrink-0 font-mono text-2xl font-light tracking-tight whitespace-nowrap text-fg tabular">{value}</span>
        )}
        {aside}
      </div>
      <span className="min-h-4 truncate text-xs text-subtle">{loading ? null : meta}</span>
    </div>
  );
}

/** A row of metrics divided by vertical hairlines – the "instrument strip". */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-[inset_0_0_0_1px_var(--line)] lg:grid-cols-4",
        "[&>*]:bg-surface [&>*]:px-4 [&>*]:py-3.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Key/value line used in detail lists: LABEL ........ value */
export function KeyValue({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="label shrink-0">{label}</dt>
      <dd className={cn("min-w-0 truncate text-right text-sm text-fg", mono && "font-mono text-xs tabular")}>
        {children}
      </dd>
    </div>
  );
}
