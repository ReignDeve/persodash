// app/api/vercel/projects/route.ts
import { NextResponse } from "next/server";

const VERCEL_API_BASE = "https://api.vercel.com";

type WebsiteStatus = "online" | "offline" | "building" | "unknown";

interface WebsiteSummary {
  id: string;
  name: string;
  projectId: string;
  url: string | null;
  status: WebsiteStatus;
  lastDeploy: string | null; // ISO-String
  domains: string[];
}

export async function GET() {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json(
      { error: "VERCEL_API_TOKEN is not set in environment" },
      { status: 500 }
    );
  }

  try {
    // 1) Projekte holen
    const projectsUrl = new URL("/v10/projects", VERCEL_API_BASE);
    projectsUrl.searchParams.set("limit", "100");
    if (teamId) {
      projectsUrl.searchParams.set("teamId", teamId);
    }

    const projectsRes = await fetch(projectsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!projectsRes.ok) {
      const text = await projectsRes.text();
      console.error("Vercel projects error:", text);
      return NextResponse.json(
        { error: "Failed to fetch projects from Vercel" },
        { status: 502 }
      );
    }

    const projectsData = await projectsRes.json();
    const projects: any[] = projectsData.projects ?? [];

    // 2) Für jedes Projekt: letzter Production-Deployment + Domains
    const websites: WebsiteSummary[] = await Promise.all(
      projects.map(async (project) => {
        const projectId = project.id as string;

        // --- Deployments (für Status & lastDeploy & App-URL) ---
        const deploymentsUrl = new URL("/v6/deployments", VERCEL_API_BASE);
        deploymentsUrl.searchParams.set("projectId", projectId);
        deploymentsUrl.searchParams.set("limit", "1");
        deploymentsUrl.searchParams.set("target", "production");
        if (teamId) {
          deploymentsUrl.searchParams.set("teamId", teamId);
        }

        let url: string | null = null;
        let status: WebsiteStatus = "unknown";
        let lastDeploy: string | null = null;

        try {
          const depRes = await fetch(deploymentsUrl.toString(), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          if (depRes.ok) {
            const depData = await depRes.json();
            const deployment = depData.deployments?.[0];

            if (deployment) {
              if (deployment.url) {
                url = `https://${deployment.url}`;
              }
              if (deployment.createdAt) {
                lastDeploy = new Date(deployment.createdAt).toISOString();
              }

              switch (deployment.readyState) {
                case "READY":
                  status = "online";
                  break;
                case "ERROR":
                case "CANCELED":
                  status = "offline";
                  break;
                case "BUILDING":
                case "QUEUED":
                  status = "building";
                  break;
                default:
                  status = "unknown";
              }
            }
          } else {
            console.warn(
              `Failed to fetch deployments for project ${projectId}`
            );
          }
        } catch (e) {
          console.error("Deployment fetch error", e);
        }

        // --- Domains für das Projekt ---
        const domainsUrl = new URL(
          `/v9/projects/${projectId}/domains`,
          VERCEL_API_BASE
        );
        if (teamId) {
          domainsUrl.searchParams.set("teamId", teamId);
        }

        let domains: string[] = [];
        try {
          const domRes = await fetch(domainsUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });

          if (domRes.ok) {
            const domData = await domRes.json();
            domains = domData.domains?.map((d: any) => d.name) ?? [];
          } else {
            console.warn(
              `Failed to fetch domains for project ${projectId}`
            );
          }
        } catch (e) {
          console.error("Domain fetch error", e);
        }

        return {
          id: projectId,
          name: project.name as string,
          projectId,
          url,
          status,
          lastDeploy,
          domains,
        };
      })
    );

    return NextResponse.json({ websites });
  } catch (e) {
    console.error("Vercel API route error", e);
    return NextResponse.json(
      { error: "Unexpected error talking to Vercel API" },
      { status: 500 }
    );
  }
}
