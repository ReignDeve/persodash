"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatDateTime, formatHashrate, formatTime } from "@/lib/format";
import type { HashratePoint } from "@/lib/schemas/miner";

const AXIS_TICK = { fill: "var(--fg-subtle)", fontSize: 11, fontFamily: "var(--font-mono)" };

/** Single-series hashrate history. Thin line, faint fill, crosshair tooltip. */
export function HashrateChart({ data, height = 220 }: { data: HashratePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="hashrate-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="t"
          tickFormatter={formatTime}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tickFormatter={(v: number) => formatHashrate(v, 0)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={64}
          tickCount={4}
        />
        <Tooltip
          cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <ChartTooltip
                title={formatDateTime(payload[0].payload.t)}
                rows={[{ label: "Hashrate", value: formatHashrate(payload[0].payload.hashrate) }]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="hashrate"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          fill="url(#hashrate-fill)"
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--chart-1)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Minimal inline trend for metric readouts – no axes, no tooltip. */
export function Sparkline({ data, height = 28 }: { data: HashratePoint[]; height?: number }) {
  // A flat line carries no information – leave the space empty instead.
  if (data.length < 2 || data.every((p) => p.hashrate === data[0].hashrate)) return null;
  return (
    <div className="w-full max-w-24 min-w-0" aria-hidden>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="hashrate"
            stroke="var(--chart-1)"
            strokeWidth={1.25}
            fill="none"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
