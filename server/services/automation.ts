import "server-only";

import { format } from "date-fns";

import { db } from "@/lib/db";
import { badRequest } from "@/lib/api/errors";
import { workerStatus } from "@/features/miner/status";
import { siteStatus } from "@/features/websites/status";
import type { AttentionItem, AutomationSummary } from "@/lib/schemas/automation";
import type { TripType } from "@/lib/schemas/logbook";
import { createTrip, getLogbookSummary } from "@/server/services/logbook";
import { getMinerOverview } from "@/server/services/miner";
import { countOpenNotes, createNote } from "@/server/services/notes";
import { listRoutines } from "@/server/services/routines";
import { listProjects } from "@/server/services/projects";
import { listMonitors } from "@/server/services/services";
import { listSubscriptions } from "@/server/services/subscriptions";
import { getWalletsOverview } from "@/server/services/wallets";
import { getWebsites } from "@/server/services/websites";

const RENEWAL_ATTENTION_DAYS = 3;
const RENEWALS_LISTED = 5;

export async function captureNote(text: string, projectName: string | undefined, source: string) {
  const project = projectName
    ? await db.project.findFirst({ where: { name: { equals: projectName, mode: "insensitive" } }, select: { id: true } })
    : null;
  return createNote({ body: text, projectId: project?.id ?? null }, source);
}

/**
 * Logs a trip from minimal input ("Arbeit"): distance and type are taken from
 * the most recent trip with the same description unless given explicitly.
 */
export async function logTripFromAutomation(input: {
  description: string;
  kilometers?: number;
  type?: TripType;
  date?: string;
}) {
  const previous = await db.logbookEntry.findFirst({
    where: { description: { equals: input.description, mode: "insensitive" } },
    orderBy: { date: "desc" },
  });

  const kilometers = input.kilometers ?? previous?.kilometers;
  if (!kilometers) {
    throw badRequest(`No earlier trip called “${input.description}” – pass kilometers the first time.`);
  }

  const trip = await createTrip({
    date: input.date ?? format(new Date(), "yyyy-MM-dd"),
    kilometers,
    description: previous?.description ?? input.description,
    type: input.type ?? previous?.type ?? "business",
  });
  return { trip, message: `Logged ${kilometers} km · ${trip.description}` };
}

/** Everything that needs attention, computed server-side for voice/scripts. */
export async function buildSummary(): Promise<AutomationSummary> {
  const [websites, monitors, miner, subscriptions, unreadErrors, inboxOpen, projects, logbook, wallets, routines] =
    await Promise.all([
      getWebsites(),
      listMonitors(),
      getMinerOverview(),
      listSubscriptions(),
      db.notification.findMany({ where: { readAt: null, severity: "error" }, orderBy: { createdAt: "desc" }, take: 3 }),
      countOpenNotes(),
      listProjects(),
      getLogbookSummary(),
      getWalletsOverview(),
      listRoutines(),
    ]);

  const attention: AttentionItem[] = [];

  for (const m of monitors.monitors) {
    if (m.state === "down") attention.push({ tone: "err", title: `${m.name} is down`, detail: m.lastCheck?.error ?? null });
  }
  if (websites.status === "ok") {
    for (const w of websites.websites) {
      const s = siteStatus(w);
      if (s.tone === "err" || s.tone === "warn") attention.push({ tone: s.tone, title: `${w.name}: ${s.label}`, detail: w.domains[0] ?? null });
    }
  }
  if (miner.status === "ok") {
    if (miner.workers.length === 0) attention.push({ tone: "err", title: "No mining workers connected", detail: null });
    for (const w of miner.workers) {
      const s = workerStatus(w);
      if (s.tone !== "ok") attention.push({ tone: s.tone === "err" ? "err" : "warn", title: `Worker ${w.name || w.sessionId}: ${s.label}`, detail: null });
    }
  }
  for (const s of subscriptions.items) {
    if (s.active && s.daysUntilRenewal <= RENEWAL_ATTENTION_DAYS) {
      attention.push({ tone: "warn", title: `${s.name} renews in ${s.daysUntilRenewal} day(s)`, detail: null });
    }
  }
  for (const n of unreadErrors) attention.push({ tone: "err", title: n.title, detail: null });

  attention.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "err" ? -1 : 1));

  return {
    generatedAt: new Date().toISOString(),
    headline: attention.length
      ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} attention`
      : "All systems nominal",
    attention,
    inbox: { open: inboxOpen },
    routinesDue: routines.items
      .filter((r) => r.bucket === "overdue" || r.bucket === "today")
      .map((r) => ({ title: r.title, overdueDays: Math.max(0, -r.daysUntilDue) })),
    focus: projects.projects
      .filter((p) => p.status === "active" && p.nextStep)
      .map((p) => ({ project: p.name, nextStep: p.nextStep! })),
    upcomingRenewals: subscriptions.items
      .filter((s) => s.active && s.daysUntilRenewal <= 30)
      .slice(0, RENEWALS_LISTED)
      .map((s) => ({
        name: s.name,
        date: s.nextRenewal,
        inDays: s.daysUntilRenewal,
        amount: (s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: s.currency }),
      })),
    logbook: { thisMonthKm: logbook.thisMonthKilometers },
    portfolio: { totalEur: wallets.totalEur },
  };
}
