"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import {
  fetchWorkers,
  PublicPoolWorker,
  fetchWorkersWithAlerts,
} from "../../services/publicPoolService";
import HashrateChart from "../../components/hashrateChart";

const BTC_ADDRESS = process.env.BTC_ADDRESS || "";
const MY_WORKER = process.env.WORKER || "";

type HashratePoint = {
  timestamp: string;
  hash10min: number;
  hash2h: number;
};

// small helper to format date/time in DE format for this page
const formatDateTime = (value: string) => {
  const d = new Date(value);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MinerPage() {
  const [workers, setWorkers] = useState<PublicPoolWorker[]>([]);
  const [loading, setLoading] = useState(true);

  // for the Worker Detail Modal
  const [selectedWorker, setSelectedWorker] = useState<PublicPoolWorker | null>(
    null
  );
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const ws = await fetchWorkersWithAlerts(BTC_ADDRESS);

        // own worker first
        const mine = ws.find((w) => w.sessionId === MY_WORKER);
        const others = ws.filter((w) => w.sessionId !== MY_WORKER);

        setWorkers(mine ? [mine, ...others] : ws);
      } catch (e) {
        console.error("Fehler beim Laden der Worker:", e);
        // optional TODO: set error state
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const openWorkerDetails = (worker: PublicPoolWorker) => {
    setSelectedWorker(worker);
    setIsWorkerModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner label="Lade Miner..." />
      </div>
    );
  }

  // current Hashrate -> usable for chart
  const totalH = workers.reduce((sum, w) => sum + w.hashRate, 0);
  // fake data points for hashrate chart till real history is available
  const chartData: HashratePoint[] = [
    {
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      hash10min: totalH * 0.9,
      hash2h: totalH * 0.8,
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      hash10min: totalH * 1.05,
      hash2h: totalH * 0.9,
    },
    {
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      hash10min: totalH * 1.1,
      hash2h: totalH * 1.0,
    },
    {
      timestamp: new Date().toISOString(),
      hash10min: totalH,
      hash2h: totalH * 1.05,
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Worker Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => (
          <Card
            key={worker.sessionId}
            isPressable
            onPress={() => openWorkerDetails(worker)}
          >
            <CardHeader className="flex gap-3">
              <CpuChipIcon className="size-7" />
              <div>
                <p className="text-sm font-semibold">
                  {worker.sessionId === MY_WORKER
                    ? `Mein Worker (${worker.sessionId})`
                    : worker.sessionId}
                </p>
                <p className="text-[11px] text-default-500">
                  {BTC_ADDRESS.slice(0, 10)}…{BTC_ADDRESS.slice(-6)}
                </p>
              </div>
            </CardHeader>

            <CardBody>
              <span className="text-xs text-default-500">Hashrate</span>
              <span className="text-lg font-semibold">
                {worker.hashRate.toFixed(2)} H/s
              </span>
              <Chip size="sm" variant="flat" className="mt-1 mb-2">
                {(worker.hashRate / 1_000_000).toFixed(2)} MH/s
              </Chip>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Hashrate Chart */}
      <HashrateChart data={chartData} />

      {/* Worker Detail Modal */}
      <Modal
        isOpen={isWorkerModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsWorkerModalOpen(false);
            setSelectedWorker(null);
          }
        }}
      >
        <ModalContent>
          {(onClose) =>
            selectedWorker && (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Worker Details – {selectedWorker.sessionId}
                </ModalHeader>
                <ModalBody className="space-y-2">
                  <div>
                    <p className="text-xs text-default-500">Session ID</p>
                    <p className="text-sm font-mono">
                      {selectedWorker.sessionId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-default-500">Name</p>
                    <p className="text-sm">{selectedWorker.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-default-500">Hashrate</p>
                      <p className="text-sm font-semibold">
                        {selectedWorker.hashRate.toFixed(2)} H/s
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-default-500">
                        Best Difficulty
                      </p>
                      <p className="text-sm font-semibold">
                        {selectedWorker.bestDifficulty.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-default-500">Starttime</p>
                    <p className="text-sm">
                      {formatDateTime(selectedWorker.startTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-default-500">Last Seen</p>
                    <p className="text-sm">
                      {formatDateTime(selectedWorker.lastSeen)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-default-500">Uptime (approx.)</p>
                    <p className="text-sm">
                      {(() => {
                        const start = new Date(
                          selectedWorker.startTime
                        ).getTime();
                        const last = new Date(
                          selectedWorker.lastSeen
                        ).getTime();
                        const diffMs = Math.max(0, last - start);
                        const diffH = diffMs / (1000 * 60 * 60);
                        const hours = Math.floor(diffH);
                        const minutes = Math.floor((diffH - hours) * 60);
                        return `${hours}h ${minutes}m`;
                      })()}
                    </p>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )
          }
        </ModalContent>
      </Modal>
    </div>
  );
}
