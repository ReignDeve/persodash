import type { Tone } from "@/components/ui/status";
import type { ProjectStatus } from "@/lib/schemas/projects";

export const PROJECT_TONE: Record<ProjectStatus, Tone> = { active: "info", paused: "warn", idea: "idle", done: "idle" };
