/** Weekly review: one week (Mon–Sun) of everything PersoDash knows about. */
export type WeeklyReview = {
  week: {
    /** ISO week label, e.g. "2026-W41". */
    id: string;
    number: number;
    start: string; // YYYY-MM-DD (Monday)
    end: string; // YYYY-MM-DD (Sunday)
    isCurrent: boolean;
    previous: string;
    next: string | null;
  };
  highlights: { tone: "ok" | "warn" | "err" | "info"; text: string }[];
  logbook: { km: number; previousKm: number; trips: number; businessKm: number; days: { day: string; km: number }[] };
  code: {
    configured: boolean;
    commits: number;
    deployments: number;
    projects: { name: string; commits: number; deployments: number }[];
  };
  services: {
    monitors: { name: string; uptime: number | null; incidents: number }[];
    incidents: number;
  };
  inbox: { captured: number; done: number; open: number };
  routines: { done: number; skipped: number; missed: number; items: { title: string; outcome: "done" | "skipped" | "missed" }[] };
  alerts: { warning: number; error: number };
  money: {
    portfolioStart: number | null;
    portfolioEnd: number | null;
    renewals: { name: string; date: string; amount: string }[];
    renewalsEur: number;
  };
  miner: { avgHashrate: number | null; onlineShare: number | null };
};
