"use client";

import { CalendarCheck, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { RoutineRow } from "@/features/routines/routine-row";
import { useRoutines } from "@/lib/api/queries";
import { ROUTINE_TEMPLATES, cadenceLabel, type RoutineBucket, type RoutineItem } from "@/lib/schemas/routines";

const SECTIONS: { bucket: RoutineBucket; title: string }[] = [
  { bucket: "overdue", title: "Overdue" },
  { bucket: "today", title: "Today" },
  { bucket: "week", title: "Next 7 days" },
  { bucket: "later", title: "Later" },
  { bucket: "paused", title: "Paused" },
];

export function RoutinesView() {
  const params = useSearchParams();
  const highlightId = params.get("routine");
  const { openEditor } = useAppActions();
  const { data, isPending, error, refetch } = useRoutines();

  useEffect(() => {
    if (highlightId && data) document.getElementById(`routine-${highlightId}`)?.scrollIntoView({ block: "center" });
  }, [highlightId, data]);

  if (error) {
    return (
      <Page className="max-w-4xl">
        <PageHeader title="Routines" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  const items = data?.items ?? [];
  const due = (data?.counts.overdue ?? 0) + (data?.counts.today ?? 0);
  const onTrack = items.filter((r) => r.active && r.history.length);
  const doneRate = onTrack.length
    ? Math.round(
        (onTrack.reduce((s, r) => s + r.history.filter((h) => h === "done").length, 0) /
          onTrack.reduce((s, r) => s + r.history.length, 0)) *
          100,
      )
    : null;
  const bestStreak = items.reduce<RoutineItem | null>((best, r) => (!best || r.streak > best.streak ? r : best), null);

  const addButton = (
    <Button variant="primary" size="sm" onClick={() => openEditor({ kind: "routine", item: null })}>
      <Plus />
      New routine
    </Button>
  );

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Routines" description="Recurring tasks that reschedule themselves when you tick them off." actions={addButton} />

      {items.length ? (
        <MetricStrip className="mb-4">
          <Metric label="Due now" loading={isPending} value={due} meta={data?.counts.overdue ? `${data.counts.overdue} overdue` : "Nothing overdue"} />
          <Metric label="Next 7 days" loading={isPending} value={data?.counts.week ?? 0} meta="coming up" />
          <Metric label="On time" loading={isPending} value={doneRate === null ? "–" : `${doneRate} %`} meta="of recent cycles" />
          <Metric
            label="Best streak"
            loading={isPending}
            value={bestStreak?.streak ?? 0}
            meta={bestStreak?.streak ? bestStreak.title : "Tick something off"}
          />
        </MetricStrip>
      ) : null}

      {isPending ? (
        <Panel>
          <SkeletonRows rows={4} />
        </Panel>
      ) : !items.length ? (
        <Panel>
          <EmptyState
            icon={CalendarCheck}
            title="Nothing recurring yet"
            description="Things you keep forgetting belong here. Start with one of these – you can adjust everything."
          />
          <ul className="divide-y divide-line border-t">
            {ROUTINE_TEMPLATES.map((t) => (
              <li key={t.title} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{t.title}</span>
                  <span className="block text-xs text-subtle">{cadenceLabel(t.cadence, t.interval)}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    openEditor({
                      kind: "routine",
                      item: null,
                      preset: { title: t.title, cadence: t.cadence, interval: t.interval, notes: t.notes ?? null },
                    })
                  }
                >
                  <Plus />
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {SECTIONS.map(({ bucket, title }) => {
            const rows = items.filter((r) => r.bucket === bucket);
            if (!rows.length) return null;
            return (
              <Panel key={bucket}>
                <PanelHeader title={title} meta={`${rows.length}`} />
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <RoutineRow key={r.id} routine={r} highlighted={r.id === highlightId} />
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}
    </Page>
  );
}
