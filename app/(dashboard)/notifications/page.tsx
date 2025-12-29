"use client";

import React, { useEffect, useState } from "react";
import { Notification } from "../../../types/notifications";
import { severityColor } from "../../../types/notifications";
import { Card, CardHeader, CardBody, Chip, Spinner } from "@heroui/react";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        setItems(json.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner label="Lade Notifications..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <h1 className="text-2xl font-semibold mb-2">Notifications</h1>

      {items.length === 0 && (
        <p className="text-sm text-default-500">No notifications available.</p>
      )}

      {items.map((n) => (
        <Card key={n.id}>
          <CardHeader className="flex justify-between items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{n.title}</span>
              <span className="text-xs text-default-500">
                {n.type.toUpperCase()} · {n.source}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Chip size="sm" color={severityColor(n.severity)} variant="flat">
                {n.severity}
              </Chip>
              <span className="text-[11px] text-default-400">
                {new Date(n.createdAt).toLocaleString("de-DE")}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm whitespace-pre-line">{n.message}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
