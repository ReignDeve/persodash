import { format, parseISO } from "date-fns";

import type { UptimeDay } from "@/lib/schemas/services";
import { cn } from "@/lib/utils";

const DEGRADED_BELOW = 99.5;
const OUTAGE_BELOW = 95;

function tone(day: UptimeDay) {
  if (day.checks === 0) return "bg-hover";
  const uptime = ((day.checks - day.failures) / day.checks) * 100;
  if (uptime < OUTAGE_BELOW) return "bg-err";
  if (uptime < DEGRADED_BELOW) return "bg-warn";
  return "bg-ok/70";
}

function label(day: UptimeDay) {
  const date = format(parseISO(day.day), "d MMM");
  if (day.checks === 0) return `${date}: no data`;
  const uptime = ((day.checks - day.failures) / day.checks) * 100;
  return `${date}: ${uptime.toFixed(2)} % (${day.failures} failed of ${day.checks})`;
}

/** Status-page style strip: one thin bar per day, colour only where something happened. */
export function UptimeBars({ days, className }: { days: UptimeDay[]; className?: string }) {
  return (
    <div className={cn("flex h-5 items-stretch gap-[2px]", className)} role="img" aria-label="Uptime per day, last 30 days">
      {days.map((d) => (
        <span key={d.day} title={label(d)} className={cn("w-[3px] rounded-[1px] transition-opacity hover:opacity-70", tone(d))} />
      ))}
    </div>
  );
}
