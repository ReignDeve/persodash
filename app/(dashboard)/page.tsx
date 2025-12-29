"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Button,
  Spinner,
} from "@heroui/react";
import Link from "next/link";
import {
  CpuChipIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { fetchWorkers, PublicPoolWorker } from "../services/publicPoolService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// TODO (important): Clean up and modularize this huge file!

type WebsiteStatus = "online" | "offline" | "building" | "unknown";

type Website = {
  id: string;
  name: string;
  url: string | null;
  status: WebsiteStatus;
  lastDeploy: string | null;
  projectId: string;
  domains?: string[];
};

const BTC_ADDRESS = process.env.BTC_ADDRESS || "";
const MY_WORKER = process.env.WORKER || "";

const formatHashrate = (value: number): string => {
  if (!value || value <= 0) return "0 H/s";
  if (value > 1_000_000_000)
    return (value / 1_000_000_000).toFixed(2) + " GH/s";
  if (value > 1_000_000) return (value / 1_000_000).toFixed(2) + " MH/s";
  if (value > 1_000) return (value / 1_000).toFixed(2) + " kH/s";
  return value.toFixed(0) + " H/s";
};

const formatDateTime = (value: string | null) => {
  if (!value) return "–";
  const d = new Date(value);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeShort = (value: string) => {
  const d = new Date(value);
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
  });
};

export default function Home() {
  const [workers, setWorkers] = React.useState<PublicPoolWorker[]>([]);
  const [websites, setWebsites] = React.useState<Website[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Mining
        const ws = await fetchWorkers(BTC_ADDRESS);
        const mine = ws.find((w) => w.sessionId === MY_WORKER);
        const others = ws.filter((w) => w.sessionId !== MY_WORKER);
        setWorkers(mine ? [mine, ...others] : ws);

        // Websites
        const res = await fetch("/api/vercel/projects");
        if (res.ok) {
          const data = await res.json();
          setWebsites(data.websites ?? []);
        } else {
          console.error("Failed to load websites from /api/vercel/projects");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner label="Dashboard loading..." />
      </div>
    );
  }

  // ---- Mining KPIs ----
  const workerCount = workers.length;
  const totalHashrateH = workers.reduce((sum, w) => sum + w.hashRate, 0);
  const mainWorker = workers[0];
  const hasWorkers = workerCount > 0;

  const mainWorkerOnline =
    mainWorker &&
    new Date().getTime() - new Date(mainWorker.lastSeen).getTime() <
      5 * 60 * 1000;

  // ---- Website KPIs ----
  const websiteCount = websites.length;
  const onlineCount = websites.filter((w) => w.status === "online").length;
  const offlineCount = websites.filter((w) => w.status === "offline").length;
  const buildingCount = websites.filter((w) => w.status === "building").length;

  const latestDeploy =
    websites
      .map((w) => w.lastDeploy)
      .filter(Boolean)
      .sort((a, b) => (a! < b! ? 1 : -1))[0] ?? null;

  const mainDomain = websites[0]?.domains?.[0] ?? null;

  // --- fake data for demonstration purposes only; based on real totalHashrateH ---
  const hashrateTrendData =
    totalHashrateH <= 0
      ? []
      : Array.from({ length: 6 }).map((_, i) => {
          const now = Date.now();
          const t = new Date(now - (5 - i) * 60 * 60 * 1000).toISOString();
          const jitterFactor = 0.9 + Math.random() * 0.2; // small random variation
          return {
            timestamp: t,
            value: totalHashrateH * jitterFactor,
          };
        });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            Dashboard
          </h1>
        </div>
        <div className="flex gap-3">
          <Button
            as={Link}
            href="/miner"
            variant="shadow"
            color="success"
            startContent={<CpuChipIcon className="size-4" />}
          >
            Open Miner
          </Button>
          <Button
            as={Link}
            href="/websites"
            variant="shadow"
            color="success"
            startContent={<GlobeAltIcon className="size-4" />}
          >
            Open Websites
          </Button>
        </div>
      </div>

      {/* Bento Grid: 12 Spalten */}
      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-12
          auto-rows-[minmax(140px,auto)]
          gap-4
        "
      >
        {/* 1: Big Mining-Card */}
        <Card
          className="
            lg:col-span-7
            rounded-2xl shadow-md
            bg-gradient-to-b from-[#04261b] to-emerald-800
          "
        >
          <CardHeader className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Total Hashrate</p>
              <p className="text-3xl font-semibold text-white">
                {formatHashrate(totalHashrateH)}
              </p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              className="bg-emerald-600 text-white"
              color={hasWorkers ? "success" : "default"}
            >
              {workerCount} Worker
            </Chip>
          </CardHeader>
          <CardBody className="text-xs text-emerald-400 flex flex-col gap-1">
            {hasWorkers ? (
              <>
                <p>
                  Main Worker{" "}
                  <span className="font-mono font-semibold">
                    {mainWorker.sessionId === MY_WORKER
                      ? `mine (${mainWorker.sessionId})`
                      : mainWorker.sessionId}
                  </span>{" "}
                  is currently{" "}
                  <span
                    className={
                      mainWorkerOnline ? "text-emerald-700" : "text-red-600"
                    }
                  >
                    {mainWorkerOnline ? "online" : "vermutlich offline"}
                  </span>
                  .
                </p>
                <p className="text-[11px] text-emerald-400/80">
                  Data source: Public Pool API (Realtime overview of your BTC
                  workers).
                </p>
              </>
            ) : (
              <p>No active workers found.</p>
            )}
          </CardBody>
        </Card>

        {/* 2: Websites Summary */}
        <Card
          className="
            lg:col-span-5
            rounded-2xl shadow-md
          "
        >
          <CardHeader className="flex items-center justify-between">
            <div>
              <p className="text-xs text-black">Websites</p>
              <p className="text-2xl font-semibold text-black">
                {websiteCount} Projects
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip size="sm" variant="flat" color="success">
                Online: {onlineCount}
              </Chip>
              <Chip size="sm" variant="flat" color="danger">
                Offline: {offlineCount}
              </Chip>
              {buildingCount > 0 && (
                <Chip size="sm" variant="flat" color="warning">
                  Building: {buildingCount}
                </Chip>
              )}
            </div>
            <div className="text-xs text-black">
              Main Domain:
              <br />
              <span className="font-mono font-medium text-[#04261b]">
                {mainDomain ?? "No domains configured"}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* 3: Hashrate Trend (links mittig) */}
        <Card
          className="
            lg:col-span-5 
            rounded-2xl shadow-md
            bg-[#04261b]
            text-emerald-50
            h-full
          "
        >
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-semibold">Hashrate Trend</span>
            <span className="text-[11px] text-emerald-200">last Hour</span>
          </CardHeader>
          <CardBody className="h-full">
            {hashrateTrendData.length === 0 ? (
              <div className="flex justify-center items-center h-full text-xs text-emerald-200">
                No hashrate data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hashrateTrendData}>
                  <CartesianGrid
                    stroke="#0b3a2a"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTimeShort}
                    tick={{ fill: "#d1fae5", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatHashrate(v)}
                    tick={{ fill: "#d1fae5", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#022015",
                      border: "1px solid #065f46",
                    }}
                    labelFormatter={(v) => formatTimeShort(v as string)}
                    formatter={(value: any) => formatHashrate(value as number)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* 4+5: Rechte vertikale Spalte */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Haupt-Worker Card */}
          <Card className="rounded-2xl shadow-md  h-full">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CpuChipIcon className="size-7 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-black">
                    Main-Worker
                  </p>
                  <p className="text-xs text-black/50">
                    Address: {BTC_ADDRESS.slice(0, 8)}…{BTC_ADDRESS.slice(-6)}
                  </p>
                </div>
              </div>
              {hasWorkers && (
                <Chip
                  size="sm"
                  variant="flat"
                  className="bg-emerald-50 text-black"
                  color={mainWorkerOnline ? "success" : "danger"}
                >
                  {mainWorkerOnline ? "Online" : "Offline?"}
                </Chip>
              )}
            </CardHeader>
            <CardBody className="flex flex-col gap-2 text-xs">
              {hasWorkers ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-black">Session ID</span>
                    <span className="font-mono">{mainWorker.sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Hashrate</span>
                    <span>{formatHashrate(mainWorker.hashRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Best Difficulty</span>
                    <span>{mainWorker.bestDifficulty.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Last Seen</span>
                    <span>{formatDateTime(mainWorker.lastSeen)}</span>
                  </div>
                </>
              ) : (
                <p className="text-default-500">No worker-data available</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Deployments */}
        <Card className="rounded-2xl lg:col-span-3 shadow-md">
          <CardHeader className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-black">Deployments</p>
              <p className="text-xs text-black/50">
                Last changes to my projects
              </p>
            </div>
            <Button size="sm" isIconOnly variant="light" className="min-w-0">
              <PlusIcon className="size-4 text-emerald-700" />
            </Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {websites.length === 0 ? (
              <p className="text-xs text-default-500">No projects found</p>
            ) : (
              websites
                .slice()
                .sort((a, b) => {
                  const da = a.lastDeploy ?? "";
                  const db = b.lastDeploy ?? "";
                  return da < db ? 1 : -1;
                })
                .slice(0, 5)
                .map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-black">
                          {site.name}
                        </span>
                        <span className="text-[11px] text-black/50">
                          {formatDateTime(site.lastDeploy)}
                        </span>
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={
                        site.status === "online"
                          ? "success"
                          : site.status === "offline"
                            ? "danger"
                            : site.status === "building"
                              ? "warning"
                              : "default"
                      }
                    >
                      {site.status}
                    </Chip>
                  </div>
                ))
            )}
          </CardBody>
        </Card>

        {/* Systemstatus */}
        <Card className="lg:col-span-4 rounded-2xl shadow-md">
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-semibold text-black">
              Systemstatus
            </span>
            <ArrowPathIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardBody className="flex flex-col gap-2 text-xs text-black">
            <div className="flex justify-between">
              <span>Last Deploy</span>
              <span>{formatDateTime(latestDeploy)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Projects</span>
              <span>{websiteCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Workers</span>
              <span>{workerCount}</span>
            </div>
          </CardBody>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-6 rounded-2xl shadow-md ">
          <CardHeader>
            <span className="text-sm font-semibold text-black">Notes</span>
          </CardHeader>
          <CardBody className="text-xs text-emerald-800">
            <p></p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
