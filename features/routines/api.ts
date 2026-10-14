"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import { formatDayMonth } from "@/lib/format";
import type { RoutineAction } from "@/lib/schemas/routines";

/** Done / skip / snooze. The row shows a filled check while pending, then moves with the server result. */
export function useRoutineAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...action }: RoutineAction & { id: string }) =>
      api<{ nextDue: string }>(`/api/routines/${id}/action`, { method: "POST", body: action }),
    onSuccess: (res, { action }) => {
      const verb = action === "done" ? "Done" : action === "skip" ? "Skipped" : "Snoozed";
      toast.success(`${verb} · next on ${formatDayMonth(res.nextDue)}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.routines });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
    },
  });
}
