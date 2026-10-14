import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Content column. Pages are wide (tool, not article) but capped for very large screens. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[var(--content-max)] px-4 py-5 md:px-6 lg:px-8 lg:py-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-medium tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-subtle">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
