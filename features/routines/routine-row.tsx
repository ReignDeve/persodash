"use client";

import { Check, MoreHorizontal, Pause, Pencil, Play, SkipForward, Timer, Trash2 } from "lucide-react";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useRoutineAction } from "@/features/routines/api";
import { queryKeys } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import { formatDayMonth } from "@/lib/format";
import { cadenceLabel, type RoutineInput, type RoutineItem } from "@/lib/schemas/routines";
import { cn } from "@/lib/utils";

export function dueLabel(r: RoutineItem) {
  if (!r.active) return "paused";
  if (r.daysUntilDue < 0) return `${-r.daysUntilDue} day${r.daysUntilDue === -1 ? "" : "s"} overdue`;
  if (r.daysUntilDue === 0) return "today";
  if (r.daysUntilDue === 1) return "tomorrow";
  return `in ${r.daysUntilDue} days`;
}

/** Shared by the routines page and the overview's "Today" panel. */
export function RoutineRow({
  routine: r,
  highlighted,
  compact,
}: {
  routine: RoutineItem;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const { openEditor } = useAppActions();
  const act = useRoutineAction();
  const { save, remove } = useCrud<RoutineInput>({ endpoint: "/api/routines", noun: "Routine", invalidate: [queryKeys.routines] });
  const isDue = r.bucket === "overdue" || r.bucket === "today";
  const completing = act.isPending && act.variables?.action === "done";

  const toInput = (patch: Partial<RoutineInput>): RoutineInput => ({
    title: r.title,
    notes: r.notes,
    cadence: r.cadence,
    interval: r.interval,
    nextDue: r.nextDue,
    remind: r.remind,
    active: r.active,
    projectId: r.project?.id ?? null,
    ...patch,
  });

  return (
    <li
      id={`routine-${r.id}`}
      className={cn("group flex items-center gap-3 px-4 transition-colors hover:bg-hover", compact ? "py-2" : "py-2.5", highlighted && "bg-accent-soft")}
    >
      <Tooltip content="Mark as done">
        <button
          type="button"
          onClick={() => act.mutate({ id: r.id, action: "done" })}
          disabled={!r.active || act.isPending}
          aria-label={`Mark “${r.title}” as done`}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm text-transparent transition-colors disabled:opacity-40",
            "shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover hover:text-fg",
            r.bucket === "overdue" && "shadow-[inset_0_0_0_1px_var(--warn)]",
            completing && "bg-fg text-inverse shadow-none",
          )}
        >
          <Check className="size-3" strokeWidth={2.5} />
        </button>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm text-fg transition-opacity", completing && "opacity-50")}>{r.title}</div>
        {compact ? null : (
          <div className="truncate text-xs text-subtle">
            {cadenceLabel(r.cadence, r.interval)}
            {r.project ? ` · ${r.project.name}` : ""}
            {r.streak > 1 ? ` · ${r.streak}× in a row` : ""}
          </div>
        )}
      </div>

      {compact || !r.history.length ? null : (
        <div className="hidden items-center gap-[3px] sm:flex" aria-label="Recent cycles">
          {r.history.map((h, i) => (
            <span
              key={i}
              title={h}
              className={cn("size-2 rounded-[2px]", h === "done" ? "bg-ok/70" : h === "late" ? "bg-warn" : "bg-hover")}
            />
          ))}
        </div>
      )}

      <div className="w-24 shrink-0 text-right">
        <div className={cn("text-xs", r.bucket === "overdue" ? "text-warn" : isDue ? "text-fg" : "text-muted")}>{dueLabel(r)}</div>
        {compact ? null : <div className="font-mono text-2xs text-subtle tabular">{formatDayMonth(r.nextDue)}</div>}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.title}`} className="md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100 md:focus-visible:opacity-100">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          <DropdownMenuItem icon={<Check />} disabled={!r.active} onSelect={() => act.mutate({ id: r.id, action: "done" })}>
            Mark as done
          </DropdownMenuItem>
          <DropdownMenuItem icon={<SkipForward />} disabled={!r.active} onSelect={() => act.mutate({ id: r.id, action: "skip" })}>
            Skip this time
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={<Timer />}>Snooze</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {[1, 3, 7].map((days) => (
                <DropdownMenuItem key={days} onSelect={() => act.mutate({ id: r.id, action: "snooze", days })}>
                  {days === 1 ? "Until tomorrow" : days === 7 ? "One week" : `${days} days`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<Pencil />} onSelect={() => openEditor({ kind: "routine", item: r })}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={r.active ? <Pause /> : <Play />}
            onSelect={() => save.mutate({ id: r.id, input: toInput({ active: !r.active }) })}
          >
            {r.active ? "Pause" : "Resume"}
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate(r.id)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
