"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatDateTime, formatTime } from "@/lib/format";

const AXIS_TICK = { fill: "var(--fg-subtle)", fontSize: 11, fontFamily: "var(--font-mono)" };

/** Response time over the last 24h. Failed checks (no latency) leave a gap. */
export function LatencyChart({ data, height = 160 }: { data: { t: string; ms: number | null }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey="t" tickFormatter={formatTime} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={48} />
        <YAxis
          tickFormatter={(v: number) => `${v} ms`}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={56}
          tickCount={4}
        />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <ChartTooltip
                title={formatDateTime(payload[0].payload.t)}
                rows={[
                  {
                    label: "Response",
                    value: payload[0].payload.ms === null ? "failed" : `${payload[0].payload.ms} ms`,
                  },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="ms"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          fill="var(--chart-1)"
          fillOpacity={0.08}
          connectNulls={false}
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--chart-1)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
