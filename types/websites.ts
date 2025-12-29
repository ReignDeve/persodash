export type WebsiteStatus = "online" | "offline" | "building" | "unknown";

export type Website = {
  id: string;
  name: string;
  url: string | null;
  status: WebsiteStatus;
  lastDeploy: string | null;
  projectId: string;
  domains?: string[];
};

export const statusColorMap: Record<
  WebsiteStatus,
  "success" | "danger" | "warning" | "default"
> = {
  online: "success",
  offline: "danger",
  building: "warning",
  unknown: "default",
};
