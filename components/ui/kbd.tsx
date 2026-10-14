import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs px-1",
        "font-mono text-2xs text-subtle shadow-[inset_0_0_0_1px_var(--line-strong)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
