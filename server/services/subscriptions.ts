import "server-only";

import { addMonths, format } from "date-fns";

import { db } from "@/lib/db";
import type { Subscription } from "@/app/generated/prisma/client";
import {
  CYCLE_MONTHS,
  type Currency,
  type SubscriptionInput,
  type SubscriptionItem,
  type SubscriptionsResponse,
} from "@/lib/schemas/subscriptions";
import { fetchPricesSafe } from "@/server/integrations/prices";
import { notify, transitionAlert } from "@/server/services/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_DAYS = 30;

// Renewal dates are calendar days; all math happens on UTC midnight values.
const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
const fromDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
const today = () => fromDateOnly(format(new Date(), "yyyy-MM-dd"));
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

/** Moves past renewal dates forward by whole billing cycles. */
function rollForward(sub: Pick<Subscription, "nextRenewal" | "cycle">) {
  const now = today();
  let next = sub.nextRenewal;
  let i = 0;
  while (next < now) {
    i++;
    next = fromDateOnly(toDateOnly(addMonths(sub.nextRenewal, CYCLE_MONTHS[sub.cycle] * i)));
  }
  return next;
}

/** Persists rolled-forward renewal dates so reminders and lists stay correct. */
async function advancePastRenewals() {
  const overdue = await db.subscription.findMany({ where: { nextRenewal: { lt: today() } } });
  await Promise.all(
    overdue.map((s) => db.subscription.update({ where: { id: s.id }, data: { nextRenewal: rollForward(s) } })),
  );
}

function toEur(cents: number, currency: string, usdToEur: number | null) {
  const amount = cents / 100;
  if (currency === "EUR") return amount;
  if (currency === "USD" && usdToEur) return amount * usdToEur;
  return null;
}

export async function listSubscriptions(): Promise<SubscriptionsResponse> {
  await advancePastRenewals();
  const [subs, prices] = await Promise.all([
    db.subscription.findMany({
      orderBy: [{ active: "desc" }, { nextRenewal: "asc" }],
      include: { project: { select: { id: true, name: true } } },
    }),
    fetchPricesSafe(),
  ]);
  const now = today();

  const items = subs.map((s): SubscriptionItem => {
    const perCycleEur = toEur(s.amountCents, s.currency, prices.usdToEur);
    const months = CYCLE_MONTHS[s.cycle];
    return {
      id: s.id,
      name: s.name,
      amountCents: s.amountCents,
      currency: s.currency as Currency,
      cycle: s.cycle,
      nextRenewal: toDateOnly(s.nextRenewal),
      daysUntilRenewal: daysBetween(now, s.nextRenewal),
      category: s.category,
      remindDays: s.remindDays,
      active: s.active,
      url: s.url,
      project: s.project,
      monthlyEur: perCycleEur === null ? null : perCycleEur / months,
      yearlyEur: perCycleEur === null ? null : (perCycleEur / months) * 12,
    };
  });

  const active = items.filter((i) => i.active);
  const monthlyEur = active.reduce((sum, i) => sum + (i.monthlyEur ?? 0), 0);
  const byCategory = new Map<string, number>();
  for (const i of active) {
    const key = i.category ?? "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + (i.monthlyEur ?? 0));
  }

  return {
    items,
    totals: {
      monthlyEur,
      yearlyEur: monthlyEur * 12,
      next30DaysEur: active
        .filter((i) => i.daysUntilRenewal <= UPCOMING_DAYS)
        .reduce((sum, i) => sum + (toEur(i.amountCents, i.currency, prices.usdToEur) ?? 0), 0),
      byCategory: [...byCategory.entries()]
        .map(([category, value]) => ({ category, monthlyEur: value }))
        .sort((a, b) => b.monthlyEur - a.monthlyEur),
    },
    usdToEur: prices.usdToEur,
  };
}

function toData(input: SubscriptionInput) {
  const { amount, nextRenewal, ...rest } = input;
  return { ...rest, amountCents: Math.round(amount * 100), nextRenewal: fromDateOnly(nextRenewal) };
}

export function createSubscription(input: SubscriptionInput) {
  return db.subscription.create({ data: toData(input) });
}

export function updateSubscription(id: string, input: SubscriptionInput) {
  return db.subscription.update({ where: { id }, data: toData(input) });
}

export async function deleteSubscription(id: string) {
  await db.subscription.delete({ where: { id } });
}

/**
 * Scheduled job: one reminder per subscription and renewal date, sent when the
 * renewal enters the subscription's reminder window.
 */
export async function runRenewalReminders() {
  await advancePastRenewals();
  const now = today();
  const subs = await db.subscription.findMany({ where: { active: true, remindDays: { gt: 0 } } });

  let sent = 0;
  for (const s of subs) {
    const days = daysBetween(now, s.nextRenewal);
    if (days < 0 || days > s.remindDays) continue;

    const change = await transitionAlert(`subscription:${s.id}:${toDateOnly(s.nextRenewal)}`, true);
    if (change !== "raised") continue;

    const price = (s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: s.currency });
    await notify({
      category: "subscription",
      severity: days <= 2 ? "warning" : "info",
      title: days === 0 ? `${s.name} renews today` : `${s.name} renews in ${days} day${days === 1 ? "" : "s"}`,
      message: `${price} on ${s.nextRenewal.toLocaleDateString("de-DE", { timeZone: "UTC" })}. Cancel or update it in time if you no longer need it.`,
      source: `subscription:${s.id}`,
    });
    sent++;
  }
  return { sent };
}
