"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import { formatHashrate, formatTime } from "@/utils/hashrate";
import { Card, CardBody, CardHeader } from "@heroui/react";

interface HashratePoint {
  timestamp: string;
  hash10min: number;
  hash2h: number;
}

export default function HashrateChart({ data }: { data: HashratePoint[] }) {
  return (
    <Card className="w-full h-[420px] bg-white border border-[#0a1724]">
      <CardHeader>
        <div className="flex flex-col items-start">
          <p className="text-sm font-semibold text-gray-600">Hashrate Chart</p>
          <p className="text-xs text-gray-400">2 Hour & 10 Minute Avg</p>
        </div>
      </CardHeader>

      <CardBody>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              stroke="#1b2b3b"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => formatTime(v)}
              tick={{ fill: "#8ba6c1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tickFormatter={(v) => formatHashrate(v)}
              tick={{ fill: "#8ba6c1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#0c1c2c",
                border: "1px solid #1b2b3b",
              }}
              labelStyle={{ color: "#cdd7e1" }}
              formatter={(value: any) => formatHashrate(value)}
            />

            {/* 10-Minute Line */}
            <Line
              type="monotone"
              dataKey="hash10min"
              stroke="#4aa8ff"
              strokeWidth={2}
              dot={false}
            />

            {/* 2-Hour Line */}
            <Line
              type="monotone"
              dataKey="hash2h"
              stroke="#e0b025"
              strokeWidth={3}
              dot={false}
            />

            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              iconType="circle"
              formatter={(value) =>
                value === "hash2h" ? "2 Hour" : value === "hash10min" ? "10 Minute" : value
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
