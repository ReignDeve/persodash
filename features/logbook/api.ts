"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import { formatKm } from "@/lib/format";
import type { LogbookResponse, Trip, TripInput } from "@/lib/schemas/logbook";

const UNDO_WINDOW_MS = 5000;

export function useSaveTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TripInput }) =>
      id
        ? api<Trip>(`/api/logbook/${id}`, { method: "PATCH", body: input })
        : api<Trip>("/api/logbook", { method: "POST", body: input }),
    onSuccess: (trip, { id }) => {
      toast.success(id ? "Trip updated" : `Logged ${formatKm(trip.kilometers)}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.logbook.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}

/**
 * Delete with undo: the row disappears immediately (optimistic), the actual
 * DELETE request is sent once the undo window has passed.
 */
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return (trip: Trip) => {
    const snapshots = queryClient.getQueriesData<LogbookResponse>({ queryKey: queryKeys.logbook.all });
    queryClient.setQueriesData<LogbookResponse>({ queryKey: queryKeys.logbook.all }, (old) =>
      old ? { ...old, trips: old.trips.filter((t) => t.id !== trip.id) } : old,
    );

    let undone = false;
    const restore = () => snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));

    const timer = setTimeout(async () => {
      if (undone) return;
      try {
        await api(`/api/logbook/${trip.id}`, { method: "DELETE" });
      } catch (error) {
        restore();
        toast.error(`Could not delete trip: ${(error as Error).message}`);
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.logbook.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
      }
    }, UNDO_WINDOW_MS);

    toast("Trip deleted", {
      description: trip.description,
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          restore();
        },
      },
    });
  };
}
