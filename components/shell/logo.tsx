import { cn } from "@/lib/utils";

/** Mark: two opposing corner brackets framing a point – a personal viewport. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-4", className)}>
      <path d="M1.5 6V1.5H6M14.5 10v4.5H10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] font-light uppercase tracking-[var(--tracking-wordmark)] text-fg", className)}>
      Persodash
    </span>
  );
}
