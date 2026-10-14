import "server-only";

import { db } from "@/lib/db";
import { formatDate, formatKm, shortenAddress } from "@/lib/format";
import type { SearchResult } from "@/lib/schemas/overview";
import { CHAIN_META } from "@/lib/schemas/wallets";
import { listWalletRefs } from "@/server/services/wallets";
import { getWebsites } from "@/server/services/websites";

const PER_GROUP = 6;

/**
 * Global search is a list of providers. Adding a new data type (notes,
 * projects, LUCY memories …) means adding one provider here.
 */
type SearchProvider = (q: string) => Promise<SearchResult[]>;

const tripsProvider: SearchProvider = async (q) => {
  const trips = await db.logbookEntry.findMany({
    where: { description: { contains: q, mode: "insensitive" } },
    orderBy: { date: "desc" },
    take: PER_GROUP,
  });
  return trips.map((t) => ({
    id: `trip:${t.id}`,
    group: "Trips",
    title: t.description,
    subtitle: `${formatDate(t.date)} · ${formatKm(t.kilometers)} · ${t.type}`,
    href: `/logbook?trip=${t.id}`,
  }));
};

const notificationsProvider: SearchProvider = async (q) => {
  const items = await db.notification.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: PER_GROUP,
  });
  return items.map((n) => ({
    id: `notification:${n.id}`,
    group: "Notifications",
    title: n.title,
    subtitle: formatDate(n.createdAt),
    href: `/notifications?id=${n.id}`,
  }));
};

const walletsProvider: SearchProvider = async (q) => {
  const needle = q.toLowerCase();
  const wallets = await listWalletRefs();
  return wallets
    .filter((w) => w.label.toLowerCase().includes(needle) || w.address.toLowerCase().includes(needle))
    .slice(0, PER_GROUP)
    .map((w) => ({
      id: `wallet:${w.id}`,
      group: "Wallets",
      title: w.label,
      subtitle: `${CHAIN_META[w.chain].label} · ${shortenAddress(w.address)}`,
      href: "/wallets",
    }));
};

const websitesProvider: SearchProvider = async (q) => {
  const needle = q.toLowerCase();
  const result = await getWebsites();
  if (result.status !== "ok") return [];
  return result.websites
    .filter((w) => w.name.toLowerCase().includes(needle) || w.domains.some((d) => d.includes(needle)))
    .slice(0, PER_GROUP)
    .map((w) => ({
      id: `website:${w.id}`,
      group: "Websites",
      title: w.name,
      subtitle: w.domains[0] ?? undefined,
      href: w.primaryUrl ?? "/websites",
      external: Boolean(w.primaryUrl),
    }));
};

const projectsProvider: SearchProvider = async (q) => {
  const projects = await db.project.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { repo: { contains: q, mode: "insensitive" } },
        { nextStep: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    take: PER_GROUP,
  });
  return projects.map((p) => ({
    id: `project:${p.id}`,
    group: "Projects",
    title: p.name,
    subtitle: p.nextStep ? `→ ${p.nextStep}` : (p.repo ?? undefined),
    href: `/projects?project=${p.id}`,
  }));
};

const servicesProvider: SearchProvider = async (q) => {
  const monitors = await db.monitor.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { url: { contains: q, mode: "insensitive" } }] },
    take: PER_GROUP,
  });
  return monitors.map((m) => ({
    id: `monitor:${m.id}`,
    group: "Services",
    title: m.name,
    subtitle: m.url,
    href: "/services",
  }));
};

const subscriptionsProvider: SearchProvider = async (q) => {
  const subs = await db.subscription.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] },
    take: PER_GROUP,
  });
  return subs.map((s) => ({
    id: `subscription:${s.id}`,
    group: "Subscriptions",
    title: s.name,
    subtitle: `${(s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: s.currency })} · ${s.cycle} · renews ${formatDate(s.nextRenewal)}`,
    href: "/subscriptions",
  }));
};

const notesProvider: SearchProvider = async (q) => {
  const notes = await db.note.findMany({
    where: { body: { contains: q, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: PER_GROUP,
  });
  return notes.map((n) => ({
    id: `note:${n.id}`,
    group: "Inbox",
    title: n.body.split("\n")[0].slice(0, 120),
    subtitle: `${n.doneAt ? "Done" : "Open"} · ${formatDate(n.createdAt)}`,
    href: `/inbox?note=${n.id}`,
  }));
};

const routinesProvider: SearchProvider = async (q) => {
  const routines = await db.routine.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    orderBy: { nextDue: "asc" },
    take: PER_GROUP,
  });
  return routines.map((r) => ({
    id: `routine:${r.id}`,
    group: "Routines",
    title: r.title,
    subtitle: `${r.cadence} · due ${formatDate(r.nextDue)}`,
    href: `/routines?routine=${r.id}`,
  }));
};

const actionsProvider: SearchProvider = async (q) => {
  const actions = await db.httpAction.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { url: { contains: q, mode: "insensitive" } }] },
    take: PER_GROUP,
  });
  return actions.map((a) => ({
    id: `action:${a.id}`,
    group: "Actions",
    title: a.name,
    subtitle: `${a.method} ${a.url}`,
    href: `/actions?action=${a.id}`,
  }));
};

const PROVIDERS: SearchProvider[] = [
  notesProvider,
  actionsProvider,
  routinesProvider,
  projectsProvider,
  servicesProvider,
  subscriptionsProvider,
  tripsProvider,
  websitesProvider,
  walletsProvider,
  notificationsProvider,
];

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const results = await Promise.allSettled(PROVIDERS.map((p) => p(q)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
