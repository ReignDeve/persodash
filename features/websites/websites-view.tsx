"use client";

import { ArrowUpRight, Copy, Globe, GitBranch, MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Metric, MetricStrip } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Status } from "@/components/ui/status";
import { siteStatus } from "@/features/websites/status";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { useWebsites } from "@/lib/api/queries";
import { copyToClipboard } from "@/lib/hooks/use-copy";
import { formatRelative, hostname } from "@/lib/format";
import type { Website } from "@/lib/schemas/websites";

type Filter = "all" | "issues";

export function WebsitesView() {
  const { data, isPending, isFetching, refetch, error } = useWebsites();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const sites = useMemo(() => (data?.status === "ok" ? data.websites : []), [data]);
  const issues = useMemo(
    () => sites.filter((w) => ["err", "warn"].includes(siteStatus(w).tone)),
    [sites],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (filter === "issues" ? issues : sites).filter(
      (w) => !q || w.name.toLowerCase().includes(q) || w.domains.some((d) => d.includes(q)),
    );
  }, [filter, issues, sites, query]);

  const latencies = sites.map((w) => w.health.latencyMs).filter((v): v is number => v !== null);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
  const lastDeploy = sites.find((w) => w.deployment.createdAt);

  if (error) {
    return (
      <Page>
        <PageHeader title="Websites" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Websites"
        description="Production deployments on Vercel, checked for reachability every minute."
        actions={
          <Tooltip content={data?.status === "ok" ? `Updated ${formatRelative(data.fetchedAt)}` : "Refresh"}>
            <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={() => refetch()}>
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            </Button>
          </Tooltip>
        }
      />

      {data && data.status !== "ok" ? (
        <Panel>
          <EmptyState
            icon={Globe}
            title={data.status === "not_configured" ? "Vercel not connected" : "Vercel unavailable"}
            description={data.message}
          />
        </Panel>
      ) : (
        <>
          <MetricStrip className="mb-4">
            <Metric
              label="Online"
              loading={isPending}
              value={`${sites.length - issues.length}/${sites.length}`}
              meta={issues.length ? `${issues.length} need attention` : "All reachable"}
            />
            <Metric label="Projects" loading={isPending} value={sites.length} meta="on Vercel" />
            <Metric
              label="Avg. response"
              loading={isPending}
              value={avgLatency === null ? "–" : `${avgLatency} ms`}
              meta="HEAD request from this server"
            />
            <Metric
              label="Last deploy"
              loading={isPending}
              value={<span className="text-lg">{formatRelative(lastDeploy?.deployment.createdAt)}</span>}
              meta={lastDeploy?.name}
            />
          </MetricStrip>

          <Panel>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter projects"
                  aria-label="Filter projects"
                  className="h-7 pl-8 text-xs"
                />
              </div>
              <Segmented
                aria-label="Show"
                value={filter}
                onValueChange={setFilter}
                options={[
                  { value: "all", label: "All", count: sites.length },
                  { value: "issues", label: "Issues", count: issues.length },
                ]}
              />
            </div>
            {isPending ? (
              <SkeletonRows rows={5} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={filter === "issues" ? "No issues" : "No projects"}
                description={filter === "issues" ? "Every site is reachable and built." : undefined}
              />
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th className="w-28">Status</Th>
                    <Th>Project</Th>
                    <Th className="hidden lg:table-cell">Last commit</Th>
                    <Th className="hidden text-right sm:table-cell">Response</Th>
                    <Th className="text-right">Deployed</Th>
                    <Th className="w-10">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </Tr>
                </THead>
                <TBody>
                  {visible.map((w) => (
                    <WebsiteRow key={w.id} site={w} />
                  ))}
                </TBody>
              </Table>
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}

function WebsiteRow({ site }: { site: Website }) {
  const status = siteStatus(site);
  const domain = hostname(site.primaryUrl);

  return (
    <Tr>
      <Td>
        <Status {...status} />
      </Td>
      <Td>
        <div className="flex flex-col">
          <span className="text-fg">{site.name}</span>
          {domain ? (
            <a
              href={site.primaryUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 font-mono text-2xs text-subtle transition-colors hover:text-fg"
            >
              {domain}
              <ArrowUpRight className="size-3" />
            </a>
          ) : (
            <span className="text-2xs text-faint">No domain</span>
          )}
        </div>
      </Td>
      <Td className="hidden max-w-0 lg:table-cell">
        {site.deployment.commitMessage ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            {site.deployment.branch ? (
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-2xs text-subtle">
                <GitBranch className="size-3" />
                {site.deployment.branch}
              </span>
            ) : null}
            <span className="truncate">{site.deployment.commitMessage}</span>
          </div>
        ) : (
          <span className="text-xs text-faint">–</span>
        )}
      </Td>
      <Td className="hidden text-right font-mono text-xs tabular text-muted sm:table-cell">
        {site.health.latencyMs !== null ? `${site.health.latencyMs} ms` : site.health.statusCode ?? "–"}
      </Td>
      <Td className="text-right font-mono text-xs tabular text-muted">{formatRelative(site.deployment.createdAt)}</Td>
      <Td>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${site.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {site.primaryUrl ? (
              <DropdownMenuItem
                icon={<ArrowUpRight />}
                onSelect={() => window.open(site.primaryUrl!, "_blank", "noopener,noreferrer")}
              >
                Open site
              </DropdownMenuItem>
            ) : null}
            {site.deployment.url ? (
              <DropdownMenuItem
                icon={<ArrowUpRight />}
                onSelect={() => window.open(site.deployment.url!, "_blank", "noopener,noreferrer")}
              >
                Open deployment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              icon={<ArrowUpRight />}
              onSelect={() => window.open(`https://vercel.com/dashboard`, "_blank", "noopener,noreferrer")}
            >
              Vercel dashboard
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Copy />} onSelect={() => copyToClipboard(site.id, "Project ID copied")}>
              Copy project ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Td>
    </Tr>
  );
}
