"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";

type CrudOptions = {
  /** e.g. "/api/services" – items live at `${endpoint}/${id}`. */
  endpoint: string;
  /** Singular noun for toasts, e.g. "Service". */
  noun: string;
  /** Queries to refresh after a change (activity and search are always refreshed). */
  invalidate: QueryKey[];
};

/** Shared create/update/delete mutations for simple REST resources. */
export function useCrud<TInput>({ endpoint, noun, invalidate }: CrudOptions) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all(
      [...invalidate, queryKeys.activity, ["search"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TInput }) =>
      id ? api(`${endpoint}/${id}`, { method: "PATCH", body: input }) : api(endpoint, { method: "POST", body: input }),
    onSuccess: (_d, { id }) => {
      toast.success(id ? `${noun} updated` : `${noun} added`);
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`${endpoint}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(`${noun} removed`);
      void refresh();
    },
  });

  return { save, remove };
}
