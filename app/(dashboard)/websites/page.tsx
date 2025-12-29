"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Link,
  Spinner,
} from "@heroui/react";
import { statusColorMap, Website } from "@/types/websites";

const formatDateTime = (value: string | null) => {
  if (!value) return "–";
  const d = new Date(value);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function WebsitesPage() {
  const [websites, setWebsites] = React.useState<Website[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/vercel/projects");
        if (!res.ok) {
          throw new Error("API returned " + res.status);
        }
        const data = await res.json();
        setWebsites(data.websites ?? []);
      } catch (e) {
        console.error(e);
        setError(
          "Data fetching error from Vercel API. Please check token & team ID."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      <Card>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Lade Projekte von Vercel..." />
            </div>
          ) : error ? (
            <div className="text-sm text-danger-500">{error}</div>
          ) : (
            <Table
              aria-label="Tabelle der Vercel-Websites"
              removeWrapper
              shadow="none"
            >
              <TableHeader>
                <TableColumn>Name</TableColumn>
                <TableColumn>Domains</TableColumn>
                <TableColumn>URL (last deploy)</TableColumn>
                <TableColumn>Last Deploy</TableColumn>
                <TableColumn>Project ID</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody emptyContent={"Keine Websites gefunden."}>
                {websites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>

                    {/* Domains */}
                    <TableCell>
                      {site.domains && site.domains.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {site.domains.map((d) => (
                            <span key={d} className="text-xs font-mono">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-default-500">
                          No domains
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}

                    {/* URL (last deploy) */}
                    <TableCell>
                      {site.url ? (
                        <Link
                          href={site.url}
                          isExternal
                          className="text-sm"
                          underline="hover"
                        >
                          {site.url}
                        </Link>
                      ) : (
                        <span className="text-xs text-default-500">
                          No deployment
                        </span>
                      )}
                    </TableCell>

                    {/* Last Deploy */}
                    <TableCell>{formatDateTime(site.lastDeploy)}</TableCell>

                    {/* Project ID */}
                    <TableCell className="text-xs font-mono">
                      {site.projectId}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={statusColorMap[site.status]}
                        className="capitalize"
                      >
                        {site.status}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
