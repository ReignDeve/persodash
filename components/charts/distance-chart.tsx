"use client";

import { format, parse } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatKm } from "@/lib/format";
import type { MonthlyDistance } from "@/lib/schemas/logbook";

const AXIS_TICK = { fill: "var(--fg-subtle)", fontSize: 11, fontFamily: "var(--font-mono)" };

const SERIES = [
  { key: "business", label: "Business", color: "var(--chart-1)" },
  { key: "private", label: "Private", color: "var(--chart-2)" },
] as const;

const monthLabel = (m: string, pattern: string) => format(parse(m, "yyyy-MM", new Date()), pattern);

/** Kilometres per month, stacked by trip type. */
export function DistanceChart({ data, height = 180 }: { data: MonthlyDistance[]; height?: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4" aria-label="Legend">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => monthLabel(m, "MMM")}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} tickCount={4} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--hover)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as MonthlyDistance;
              return (
                <ChartTooltip
                  title={monthLabel(row.month, "MMMM yyyy")}
                  rows={[
                    ...SERIES.map((s) => ({ label: s.label, value: formatKm(row[s.key]), color: s.color })),
                    { label: "Total", value: formatKm(row.business + row.private) },
                  ]}
                />
              );
            }}
          />
          {/* 2px surface stroke separates the stacked segments */}
          <Bar dataKey="business" stackId="km" fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={1} isAnimationActive={false} />
          <Bar
            dataKey="private"
            stackId="km"
            fill="var(--chart-2)"
            stroke="var(--surface)"
            strokeWidth={1}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
