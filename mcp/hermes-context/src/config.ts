import path from "node:path";

export interface ProjectConfig {
  key: string;
  projectRoot: string;
  contextRoot: string;
  profileFile: string;
}

const HERMES_ROOT = process.env.HERMES_CONTEXT_ROOT || "H:\\agent\\hermes";
const DEFAULT_RUNTIME_ROOT = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "hermes")
  : path.join(process.cwd(), ".hermes-runtime");

export const HERMES_RUNTIME_ROOT =
  process.env.HERMES_RUNTIME_ROOT ||
  DEFAULT_RUNTIME_ROOT;

export const AUDIT_LOG_PATH =
  process.env.HERMES_CONTEXT_AUDIT_LOG ||
  path.join(HERMES_ROOT, "logs", "hermes-context-mcp.jsonl");

export const AUDIT_TRAIL_ROOT =
  process.env.HERMES_AUDIT_TRAIL_ROOT ||
  path.join(DEFAULT_RUNTIME_ROOT, "audit-trail");

export const PROJECTS: Record<string, ProjectConfig> = {
  news: {
    key: "news",
    projectRoot: "H:\\AIcode\\Trae\\news",
    contextRoot: "H:\\AIcode\\Trae\\news\\hermes",
    profileFile: path.join("profile", "project-profile.md")
  }
};

export const ALLOWED_CATEGORIES = ["profile", "incidents", "lessons", "skills", "issues"] as const;
export type ContextCategory = (typeof ALLOWED_CATEGORIES)[number];

export function getProject(project: string): ProjectConfig {
  const config = PROJECTS[project];
  if (!config) {
    throw new Error(`PROJECT_NOT_ALLOWED: ${project}`);
  }
  return config;
}
