import { AlertTriangle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-sm bg-[linear-gradient(90deg,var(--hover)_0%,var(--selected)_50%,var(--hover)_100%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}

/** Table-shaped placeholder that matches the real row rhythm to avoid layout shift. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-line", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-9 items-center gap-4 px-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 flex-1 max-w-64" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="mb-3 flex size-9 items-center justify-center rounded-md shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <Icon className="size-4 text-subtle" strokeWidth={1.5} />
        </span>
      ) : null}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-subtle">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Couldn’t load this",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={message}
      className={className}
      action={
        onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}
