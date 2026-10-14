import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A section of related information. Panels are flat surfaces separated by a
 * hairline – used sparingly; much content sits directly on the page.
 */
export function Panel({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("rounded-lg bg-surface shadow-[inset_0_0_0_1px_var(--line)]", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex h-11 items-center gap-3 border-b px-4", className)}>
      <h2 className="text-sm font-medium text-fg">{title}</h2>
      {meta ? <span className="truncate text-xs text-subtle">{meta}</span> : null}
      {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}

/** Section heading that sits directly on the page (no surface). */
export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-2 flex h-7 items-center justify-between">
      <h2 className="label">{children}</h2>
      {actions}
    </div>
  );
}
