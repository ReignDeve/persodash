"use client";

import { format, parseISO } from "date-fns";
import { Download, Pencil, Plus, Route, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import { DistanceChart } from "@/components/charts/distance-chart";
import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/menu";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useDeleteTrip } from "@/features/logbook/api";
import { useLogbook } from "@/lib/api/queries";
import { formatDayMonth, formatKm, formatNumber } from "@/lib/format";
import { TRIP_TYPE_LABEL, type Trip, type TripType } from "@/lib/schemas/logbook";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | TripType;
const ALL_YEARS = "all";

export function LogbookView() {
  const params = useSearchParams();
  const highlightId = params.get("trip");
  const { openTripDialog } = useAppActions();

  const [year, setYear] = useState<string>(ALL_YEARS);
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const yearNumber = year === ALL_YEARS ? undefined : Number(year);
  const { data, isPending, isError, error, refetch } = useLogbook(yearNumber);
  const deleteTrip = useDeleteTrip();

  const trips = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.trips ?? []).filter(
      (t) => (type === "all" || t.type === type) && (!q || t.description.toLowerCase().includes(q)),
    );
  }, [data, type, query]);

  const groups = useMemo(() => groupByMonth(trips), [trips]);
  const summary = data?.summary;
  const filteredKm = trips.reduce((s, t) => s + t.kilometers, 0);
  const businessShare =
    summary && summary.totalKilometers > 0 ? (summary.businessKilometers / summary.totalKilometers) * 100 : null;
  const monthDelta = summary ? summary.thisMonthKilometers - summary.lastMonthKilometers : 0;

  // PWA shortcut "Log trip" opens /logbook?new=1.
  const wantsNew = params.get("new") === "1";
  useEffect(() => {
    if (wantsNew) openTripDialog();
  }, [wantsNew, openTripDialog]);

  useEffect(() => {
    if (!highlightId || !data) return;
    document.getElementById(`trip-${highlightId}`)?.scrollIntoView({ block: "center" });
  }, [highlightId, data]);

  if (isError) {
    return (
      <Page>
        <PageHeader title="Logbook" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Logbook"
        description="Trips and distances – exportable for tax records."
        actions={
          <>
            <Tooltip content="Export the current year filter as CSV">
              <Button variant="ghost" size="sm" asChild>
                <a href={`/api/logbook/export${yearNumber ? `?year=${yearNumber}` : ""}`} download>
                  <Download />
                  <span className="hidden sm:inline">Export</span>
                </a>
              </Button>
            </Tooltip>
            <Tooltip content="Log trip" shortcut="C">
              <Button variant="primary" size="sm" onClick={() => openTripDialog()}>
                <Plus />
                Log trip
              </Button>
            </Tooltip>
          </>
        }
      />

      <MetricStrip className="mb-4">
        <Metric
          label="This month"
          loading={isPending}
          value={summary ? formatKm(summary.thisMonthKilometers) : null}
          meta={
            summary
              ? `${monthDelta >= 0 ? "+" : "−"}${formatNumber(Math.abs(monthDelta))} km vs last month`
              : null
          }
        />
        <Metric
          label={yearNumber ? `Total ${yearNumber}` : "Total"}
          loading={isPending}
          value={formatKm(yearNumber ? (data?.trips ?? []).reduce((s, t) => s + t.kilometers, 0) : (summary?.totalKilometers ?? 0))}
          meta={`${yearNumber ? (data?.trips.length ?? 0) : (summary?.totalTrips ?? 0)} trips`}
        />
        <Metric
          label="Business share"
          loading={isPending}
          value={businessShare === null ? "–" : `${formatNumber(businessShare)} %`}
          meta={summary ? `${formatKm(summary.businessKilometers)} business` : null}
        />
        <Metric
          label="Average trip"
          loading={isPending}
          value={summary && summary.totalTrips ? formatKm(summary.totalKilometers / summary.totalTrips) : "–"}
          meta="all time"
        />
      </MetricStrip>

      <Panel className="mb-4">
        <PanelHeader title="Distance per month" meta="Last 12 months" />
        <div className="px-4 pt-3 pb-2">
          {isPending ? <Skeleton className="h-[200px] w-full" /> : <DistanceChart data={summary?.monthly ?? []} />}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter trips"
              aria-label="Filter trips by description"
              className="h-7 pl-8 text-xs"
            />
          </div>
          <Segmented
            aria-label="Trip type"
            value={type}
            onValueChange={setType}
            options={[
              { value: "all", label: "All" },
              { value: "business", label: "Business" },
              { value: "private", label: "Private" },
            ]}
          />
          <Select
            size="sm"
            aria-label="Year"
            value={year}
            onValueChange={setYear}
            className="w-28"
            options={[
              { value: ALL_YEARS, label: "All years" },
              ...(summary?.years ?? []).map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
          <span className="ml-auto font-mono text-xs text-subtle tabular">
            {trips.length} trips · {formatKm(filteredKm)}
          </span>
        </div>

        {isPending ? (
          <SkeletonRows rows={6} />
        ) : trips.length === 0 ? (
          data?.trips.length ? (
            <EmptyState icon={Search} title="No matching trips" description="Try a different filter." />
          ) : (
            <EmptyState
              icon={Route}
              title="No trips logged yet"
              description="Log your first trip – recurring ones become one-tap templates."
              action={
                <Button variant="primary" size="sm" onClick={() => openTripDialog()}>
                  <Plus />
                  Log trip
                </Button>
              }
            />
          )
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th className="w-20">Date</Th>
                <Th>Description</Th>
                <Th className="hidden w-28 sm:table-cell">Type</Th>
                <Th className="w-24 text-right">Distance</Th>
                <Th className="hidden w-20 sm:table-cell">
                  <span className="sr-only">Actions</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {groups.map((group) => (
                <Fragment key={group.key}>
                  <tr className="bg-bg/40">
                    <td colSpan={2} className="h-8 pl-4 text-xs font-medium text-muted">
                      {group.label}
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td className="h-8 px-3 text-right font-mono text-xs text-subtle tabular">{formatKm(group.km)}</td>
                    <td className="hidden sm:table-cell" />
                  </tr>
                  {group.trips.map((trip) => (
                    <TripRow
                      key={trip.id}
                      trip={trip}
                      highlighted={trip.id === highlightId}
                      onEdit={() => openTripDialog(trip)}
                      onDelete={() => deleteTrip(trip)}
                    />
                  ))}
                </Fragment>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </Page>
  );
}

function TripRow({
  trip,
  highlighted,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Tr id={`trip-${trip.id}`} className={cn(highlighted && "bg-accent-soft")} onDoubleClick={onEdit}>
          {/* Year is in the month header, so day + month is enough. */}
          <Td className="font-mono text-xs text-muted tabular">{formatDayMonth(trip.date)}</Td>
          <Td className="max-w-0">
            <button
              type="button"
              onClick={onEdit}
              className="flex w-full min-w-0 items-center gap-2 text-left text-fg sm:pointer-events-none"
              tabIndex={-1}
            >
              <StatusDot tone={trip.type === "business" ? "info" : "idle"} className="sm:hidden" />
              <span className="truncate">{trip.description}</span>
            </button>
          </Td>
          <Td className="hidden sm:table-cell">
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              <StatusDot tone={trip.type === "business" ? "info" : "idle"} />
              {TRIP_TYPE_LABEL[trip.type]}
            </span>
          </Td>
          <Td className="text-right font-mono text-sm text-fg tabular">{formatKm(trip.kilometers)}</Td>
          <Td className="hidden text-right sm:table-cell">
            <div className="flex justify-end gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <Button variant="ghost" size="icon-sm" aria-label={`Edit trip ${trip.description}`} onClick={onEdit}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete trip ${trip.description}`} onClick={onDelete}>
                <Trash2 />
              </Button>
            </div>
          </Td>
        </Tr>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem icon={<Pencil />} onSelect={onEdit}>
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<Trash2 />} onSelect={onDelete} destructive>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function groupByMonth(trips: Trip[]) {
  const groups: { key: string; label: string; km: number; trips: Trip[] }[] = [];
  for (const trip of trips) {
    const key = trip.date.slice(0, 7);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, label: format(parseISO(trip.date), "MMMM yyyy"), km: 0, trips: [] };
      groups.push(group);
    }
    group.trips.push(trip);
    group.km += trip.kilometers;
  }
  return groups;
}
