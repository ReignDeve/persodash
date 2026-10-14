"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import type { NoteInput, NoteItem, NotePatch, NotesResponse } from "@/lib/schemas/notes";

function useRefresh() {
  const queryClient = useQueryClient();
  return (extra: readonly (readonly unknown[])[] = []) =>
    Promise.all(
      [queryKeys.notes.all, queryKeys.activity, ...extra].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useCreateNote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: NoteInput) => api<NoteItem>("/api/notes", { method: "POST", body: input }),
    onSuccess: () => {
      toast.success("Saved to inbox");
      void refresh();
    },
  });
}

/** Optimistic: the note changes (or leaves the current filter) immediately. */
export function useUpdateNote() {
  const queryClient = useQueryClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, ...patch }: NotePatch & { id: string }) =>
      api<NoteItem>(`/api/notes/${id}`, { method: "PATCH", body: patch }),
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notes.all });
      const snapshots = queryClient.getQueriesData<NotesResponse>({ queryKey: queryKeys.notes.all });
      queryClient.setQueriesData<NotesResponse>({ queryKey: queryKeys.notes.all }, (old) => {
        if (!old) return old;
        // Lists are either open or done, so toggling `done` always moves the note out.
        const items =
          patch.done === undefined
            ? old.items.map((n) => (n.id === id ? { ...n, ...patch, done: n.done } : n))
            : old.items.filter((n) => n.id !== id);
        return { ...old, items };
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => refresh(),
  });
}

export function useDeleteNote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Note deleted");
      void refresh();
    },
  });
}

export function usePromoteNote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId?: string }) =>
      api<{ projectId: string; nextStep: string }>(`/api/notes/${id}/promote`, { method: "POST", body: { projectId } }),
    onSuccess: () => {
      toast.success("Set as the project's next step");
      void refresh([queryKeys.projects]);
    },
  });
}
