export type Notification = {
  id: string;
  type: "website" | "miner" | "wallet" | "system";
  source: string;
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  createdAt: string;
};

export function severityColor(s: Notification["severity"]) {
  switch (s) {
    case "info":
      return "primary";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    default:
      return "default";
  }
}

export type CreateNotificationBody = {
  type: Notification["type"];
  source: string;
  severity: Notification["severity"];
  title: string;
  message: string;
};
