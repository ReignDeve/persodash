import { cn } from "@/lib/utils";

export type Tone = "ok" | "warn" | "err" | "info" | "idle";

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  err: "bg-err",
  info: "bg-info",
  idle: "bg-faint",
};

const TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
  info: "text-info",
  idle: "text-subtle",
};

export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-1.5 shrink-0", className)}>
      {pulse ? <span className={cn("absolute inset-0 animate-ping rounded-full opacity-40", DOT[tone])} /> : null}
      <span className={cn("relative size-1.5 rounded-full", DOT[tone])} />
    </span>
  );
}

/** "● ONLINE" – status as dot + uppercase word, not a badge. */
export function Status({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusDot tone={tone} />
      <span className={cn("text-2xs font-medium tracking-[0.08em] uppercase", TEXT[tone])}>{label}</span>
    </span>
  );
}

export function toneText(tone: Tone) {
  return TEXT[tone];
}
