import path from "node:path";

export interface ProjectConfig {
  key: string;
  contextRoot: string;
  mirrorRoot: string;
  profileFile: string;
}

const HERMES_ROOT = process.env.HERMES_CONTEXT_ROOT || "H:\\agent\\hermes";

export const AUDIT_LOG_PATH =
  process.env.HERMES_CONTEXT_AUDIT_LOG ||
  path.join(HERMES_ROOT, "logs", "hermes-context-mcp.jsonl");

export const PROJECTS: Record<string, ProjectConfig> = {
  news: {
    key: "news",
    contextRoot: path.join(HERMES_ROOT, "contexts", "news"),
    mirrorRoot: "H:\\AIcode\\Trae\\news\\hermes",
    profileFile: "project-profile.md"
  }
};

export const ALLOWED_CATEGORIES = ["profile", "incidents", "lessons", "skills"] as const;
export type ContextCategory = (typeof ALLOWED_CATEGORIES)[number];

export function getProject(project: string): ProjectConfig {
  const config = PROJECTS[project];
  if (!config) {
    throw new Error(`PROJECT_NOT_ALLOWED: ${project}`);
  }
  return config;
}
