"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/select";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { Status } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";
import { TokensSection } from "@/features/settings/tokens-section";
import { api } from "@/lib/api/client";
import { queryKeys, useSettings, useSystem } from "@/lib/api/queries";
import { formatBytes, formatDuration, formatHashrate, formatRelative } from "@/lib/format";
import {
  passwordChangeSchema,
  type AppSettings,
  type PasswordChangeValues,
  type SettingsResponse,
} from "@/lib/schemas/settings";

const MH = 1_000_000;

/** Two-column settings row: description on the left, control on the right. */
function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-6 first:pt-0 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-10">
      <div>
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        {description ? <p className="mt-1 text-xs text-subtle">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => api<AppSettings>("/api/settings", { method: "PATCH", body: patch }),
    onSuccess: (settings) => {
      queryClient.setQueryData<SettingsResponse>(queryKeys.settings, (old) => (old ? { ...old, settings } : old));
      void queryClient.invalidateQueries({ queryKey: queryKeys.miner });
      toast.success("Settings saved");
    },
  });
}

export function SettingsView() {
  const { data, isPending, error, refetch } = useSettings();

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Settings" description="Account, monitoring and the host PersoDash runs on." />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div>
          <Section title="Account" description={`Signed in as ${data.user.username}.`}>
            <PasswordForm />
          </Section>
          <Section title="Sessions" description="Devices currently signed in. Sessions expire after 30 days of inactivity.">
            <Sessions sessions={data.sessions} />
          </Section>
          <Section title="Miner alerts" description="When a worker is reported in Notifications and on Telegram.">
            {/* Re-mounts with fresh values whenever the saved settings change. */}
            <MinerSettingsForm key={JSON.stringify(data.settings.miner)} settings={data.settings} />
          </Section>
          <Section title="Notifications" description="Push delivery and the daily digest.">
            <NotificationSettings data={data} />
          </Section>
          <Section
            title="API tokens"
            description="For LUCY, iOS Shortcuts and scripts. Each token only gets the permissions you pick and can be revoked any time."
          >
            <TokensSection />
          </Section>
          <Section title="Integrations" description="Configured through environment variables on the server.">
            <ul className="divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
              {data.integrations.map((i) => (
                <li key={i.key} className="flex items-center gap-4 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-fg">{i.name}</div>
                    <div className="truncate text-xs text-subtle">{i.description}</div>
                    <div className="mt-0.5 truncate font-mono text-2xs text-faint">{i.envVars.join(" · ")}</div>
                  </div>
                  <Status tone={i.configured ? "ok" : "idle"} label={i.configured ? "Active" : "Not set"} />
                </li>
              ))}
            </ul>
          </Section>
          <Section title="System" description="The server this instance is running on.">
            <SystemInfo scheduler={data.scheduler} />
          </Section>
        </div>
      )}
    </Page>
  );
}

function PasswordForm() {
  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const change = useMutation({
    mutationFn: (values: PasswordChangeValues) => api("/api/settings/password", { method: "POST", body: values }),
    onSuccess: () => {
      form.reset();
      toast.success("Password changed – other sessions were signed out");
    },
  });

  return (
    <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="flex flex-col gap-3" noValidate>
      <input type="text" autoComplete="username" className="hidden" aria-hidden tabIndex={-1} />
      <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...fieldA11y("pw-current", errors.currentPassword?.message)} {...form.register("currentPassword")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message}>
          <Input type="password" autoComplete="new-password" {...fieldA11y("pw-new", errors.newPassword?.message)} {...form.register("newPassword")} />
        </Field>
        <Field label="Confirm" htmlFor="pw-confirm" error={errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...fieldA11y("pw-confirm", errors.confirmPassword?.message)} {...form.register("confirmPassword")} />
        </Field>
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={change.isPending}>
        {change.isPending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

function Sessions({ sessions }: { sessions: SettingsResponse["sessions"] }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.settings });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/settings/sessions/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const revokeOthers = useMutation({
    mutationFn: () => api<{ revoked: number }>("/api/settings/sessions", { method: "DELETE" }),
    onSuccess: (r) => {
      toast.success(`Signed out ${r.revoked} other session(s)`);
      void refresh();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
        {sessions.map((s) => {
          const mobile = /mobile|iphone|android/i.test(s.userAgent ?? "");
          const Icon = mobile ? Smartphone : Monitor;
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <Icon className="size-4 shrink-0 text-subtle" strokeWidth={1.6} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-fg">{describeAgent(s.userAgent)}</div>
                <div className="font-mono text-2xs text-subtle">
                  {s.ip ?? "unknown ip"} · active {formatRelative(s.lastSeenAt)}
                </div>
              </div>
              {s.current ? (
                <span className="label text-accent">This device</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => revoke.mutate(s.id)}>
                  Revoke
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > 1 ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => revokeOthers.mutate()}>
          <LogOut />
          Sign out all other sessions
        </Button>
      ) : null}
    </div>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function MinerSettingsForm({ settings }: { settings: AppSettings }) {
  const update = useUpdateSettings();
  const [minMh, setMinMh] = useState(String(settings.miner.minHashrate / MH));
  const [minutes, setMinutes] = useState(String(settings.miner.inactiveMinutes));

  const minHashrate = Number(minMh) * MH;
  const inactiveMinutes = Number(minutes);
  const valid = Number.isFinite(minHashrate) && minHashrate >= 0 && Number.isInteger(inactiveMinutes) && inactiveMinutes >= 1;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) update.mutate({ miner: { minHashrate, inactiveMinutes } });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Minimum hashrate (MH/s)" htmlFor="min-hashrate" hint={valid ? `= ${formatHashrate(minHashrate)}` : undefined}>
          <Input id="min-hashrate" type="number" min={0} step="0.1" inputMode="decimal" className="font-mono" value={minMh} onChange={(e) => setMinMh(e.target.value)} />
        </Field>
        <Field label="Offline after (minutes)" htmlFor="inactive-minutes">
          <Input id="inactive-minutes" type="number" min={1} max={1440} inputMode="numeric" className="font-mono" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={!valid || update.isPending}>
        Save
      </Button>
    </form>
  );
}

function NotificationSettings({ data }: { data: SettingsResponse }) {
  const update = useUpdateSettings();
  const n = data.settings.notifications;
  const telegram = data.integrations.find((i) => i.key === "telegram")?.configured ?? false;
  const set = (patch: Partial<AppSettings["notifications"]>) => update.mutate({ notifications: { ...n, ...patch } });

  const row = "flex items-center justify-between gap-4 py-2.5";
  return (
    <div className="divide-y divide-line">
      <label className={row}>
        <span>
          <span className="block text-sm text-fg">Telegram push</span>
          <span className="block text-xs text-subtle">
            {telegram ? "Forward alerts to your Telegram chat." : "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable."}
          </span>
        </span>
        <Switch checked={telegram && n.telegramEnabled} disabled={!telegram} onCheckedChange={(v) => set({ telegramEnabled: v })} />
      </label>
      <label className={row}>
        <span>
          <span className="block text-sm text-fg">Daily summary</span>
          <span className="block text-xs text-subtle">
            Websites, miner, portfolio and logbook in one message
            {data.scheduler.lastSummaryDate ? ` · last sent ${data.scheduler.lastSummaryDate}` : ""}.
          </span>
        </span>
        <Switch checked={n.dailySummaryEnabled} onCheckedChange={(v) => set({ dailySummaryEnabled: v })} />
      </label>
      <label className={row}>
        <span>
          <span className="block text-sm text-fg">Weekly review</span>
          <span className="block text-xs text-subtle">Highlights of the week, every Sunday at the same hour.</span>
        </span>
        <Switch checked={n.weeklyReviewEnabled} onCheckedChange={(v) => set({ weeklyReviewEnabled: v })} />
      </label>
      <div className={row}>
        <span className="text-sm text-fg">Send at</span>
        <Select
          size="sm"
          aria-label="Daily summary hour"
          className="w-24 font-mono"
          disabled={!n.dailySummaryEnabled}
          value={String(n.dailySummaryHour)}
          onValueChange={(v) => set({ dailySummaryHour: Number(v) })}
          options={Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))}
        />
      </div>
    </div>
  );
}

function SystemInfo({ scheduler }: { scheduler: SettingsResponse["scheduler"] }) {
  const { data } = useSystem();
  if (!data) return <Skeleton className="h-48" />;
  const pct = (used: number, total: number) => `${Math.round((used / total) * 100)} %`;
  return (
    <dl className="divide-y divide-line">
      <KeyValue label="Host" mono>{data.hostname}</KeyValue>
      <KeyValue label="Platform" mono>{data.platform}</KeyValue>
      <KeyValue label="Uptime" mono>{formatDuration(data.uptimeSeconds)}</KeyValue>
      <KeyValue label="Load" mono>
        {data.load.map((l) => l.toFixed(2)).join(" ")} · {data.cpuCount} cpu
      </KeyValue>
      <KeyValue label="Memory" mono>
        {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)} · {pct(data.memory.used, data.memory.total)}
      </KeyValue>
      {data.disk ? (
        <KeyValue label="Disk" mono>
          {formatBytes(data.disk.used)} / {formatBytes(data.disk.total)} · {pct(data.disk.used, data.disk.total)}
        </KeyValue>
      ) : null}
      <KeyValue label="Database" mono>
        <Status tone={data.database.ok ? "ok" : "err"} label={data.database.ok ? `Healthy · ${data.database.latencyMs} ms` : "Unreachable"} />
      </KeyValue>
      <KeyValue label="Scheduler" mono>
        {scheduler.enabled ? `last run ${formatRelative(scheduler.lastMinerRun)}` : "disabled"}
      </KeyValue>
      <KeyValue label="Runtime" mono>Node {data.nodeVersion}</KeyValue>
    </dl>
  );
}
