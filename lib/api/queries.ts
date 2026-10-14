"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { ActionsResponse } from "@/lib/schemas/actions";
import type { TokenItem } from "@/lib/schemas/automation";
import type { MinerResponse } from "@/lib/schemas/miner";
import type { NoteFilter, NotesResponse } from "@/lib/schemas/notes";
import type { WeeklyReview } from "@/lib/schemas/review";
import type { RoutinesResponse } from "@/lib/schemas/routines";
import type { ProjectsResponse } from "@/lib/schemas/projects";
import type { ServicesResponse } from "@/lib/schemas/services";
import type { SubscriptionsResponse } from "@/lib/schemas/subscriptions";
import type { NotificationsResponse } from "@/lib/schemas/notifications";
import type { ActivityItem, SearchResult, SystemStatus } from "@/lib/schemas/overview";
import type { LogbookResponse } from "@/lib/schemas/logbook";
import type { SettingsResponse } from "@/lib/schemas/settings";
import type { WalletsResponse } from "@/lib/schemas/wallets";
import type { WebsitesResponse } from "@/lib/schemas/websites";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Central query keys – invalidate by prefix, e.g. `queryKeys.logbook.all`. */
export const queryKeys = {
  miner: ["miner"] as const,
  websites: ["websites"] as const,
  wallets: ["wallets"] as const,
  logbook: {
    all: ["logbook"] as const,
    list: (year?: number) => ["logbook", { year: year ?? null }] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (status: "all" | "unread") => ["notifications", status] as const,
  },
  notes: {
    all: ["notes"] as const,
    list: (filter: NoteFilter) => ["notes", filter] as const,
  },
  tokens: ["tokens"] as const,
  routines: ["routines"] as const,
  actions: ["actions"] as const,
  review: (week?: string) => ["review", week ?? "current"] as const,
  projects: ["projects"] as const,
  projectOptions: ["projects", "options"] as const,
  services: ["services"] as const,
  subscriptions: ["subscriptions"] as const,
  activity: ["activity"] as const,
  system: ["system"] as const,
  settings: ["settings"] as const,
  search: (q: string) => ["search", q] as const,
};

export const useMiner = () =>
  useQuery({
    queryKey: queryKeys.miner,
    queryFn: ({ signal }) => api<MinerResponse>("/api/miner", { signal }),
    refetchInterval: MINUTE,
  });

export const useWebsites = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: queryKeys.websites,
    queryFn: ({ signal }) => api<WebsitesResponse>("/api/websites", { signal }),
    refetchInterval: 2 * MINUTE,
  });

export const useWallets = () =>
  useQuery({
    queryKey: queryKeys.wallets,
    queryFn: ({ signal }) => api<WalletsResponse>("/api/wallets", { signal }),
    staleTime: MINUTE,
  });

export const useLogbook = (year?: number, opts: { enabled?: boolean } = {}) =>
  useQuery({
    enabled: opts.enabled ?? true,
    queryKey: queryKeys.logbook.list(year),
    queryFn: ({ signal }) => api<LogbookResponse>(`/api/logbook${year ? `?year=${year}` : ""}`, { signal }),
    placeholderData: (prev) => prev,
  });

export const useNotifications = (status: "all" | "unread" = "all") =>
  useQuery({
    queryKey: queryKeys.notifications.list(status),
    queryFn: ({ signal }) => api<NotificationsResponse>(`/api/notifications?status=${status}`, { signal }),
    refetchInterval: MINUTE,
  });

export const useActivity = () =>
  useQuery({
    queryKey: queryKeys.activity,
    queryFn: ({ signal }) => api<{ items: ActivityItem[] }>("/api/activity", { signal }),
    refetchInterval: 2 * MINUTE,
  });

export const useSystem = () =>
  useQuery({
    queryKey: queryKeys.system,
    queryFn: ({ signal }) => api<SystemStatus>("/api/system", { signal }),
    refetchInterval: 30 * SECOND,
  });

export const useSettings = () =>
  useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => api<SettingsResponse>("/api/settings", { signal }),
  });

export const useSearch = (q: string) =>
  useQuery({
    queryKey: queryKeys.search(q),
    queryFn: ({ signal }) => api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`, { signal }),
    enabled: q.trim().length >= 2,
    staleTime: 30 * SECOND,
    placeholderData: (prev) => prev,
  });

export const useProjects = () =>
  useQuery({
    queryKey: queryKeys.projects,
    queryFn: ({ signal }) => api<ProjectsResponse>("/api/projects", { signal }),
    staleTime: MINUTE,
  });

export const useProjectOptions = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.projectOptions,
    queryFn: ({ signal }) => api<{ projects: { id: string; name: string }[] }>("/api/projects/options", { signal }),
    enabled,
  });

export const useServices = () =>
  useQuery({
    queryKey: queryKeys.services,
    queryFn: ({ signal }) => api<ServicesResponse>("/api/services", { signal }),
    refetchInterval: MINUTE,
  });

export const useSubscriptions = () =>
  useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: ({ signal }) => api<SubscriptionsResponse>("/api/subscriptions", { signal }),
  });

export const useNotes = (filter: NoteFilter = "open") =>
  useQuery({
    queryKey: queryKeys.notes.list(filter),
    queryFn: ({ signal }) => api<NotesResponse>(`/api/notes?filter=${filter}`, { signal }),
    placeholderData: (prev) => prev,
  });

export const useTokens = () =>
  useQuery({
    queryKey: queryKeys.tokens,
    queryFn: ({ signal }) => api<{ tokens: TokenItem[] }>("/api/settings/tokens", { signal }),
  });

export const useRoutines = () =>
  useQuery({
    queryKey: queryKeys.routines,
    queryFn: ({ signal }) => api<RoutinesResponse>("/api/routines", { signal }),
  });

export const useReview = (week?: string) =>
  useQuery({
    queryKey: queryKeys.review(week),
    queryFn: ({ signal }) => api<WeeklyReview>(`/api/review${week ? `?week=${week}` : ""}`, { signal }),
    placeholderData: (prev) => prev,
    staleTime: 5 * MINUTE,
  });

export const useActions = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.actions,
    queryFn: ({ signal }) => api<ActionsResponse>("/api/actions", { signal }),
    enabled,
  });
