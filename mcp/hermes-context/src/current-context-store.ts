import fs from "node:fs/promises";
import path from "node:path";
import { getProject } from "./config.js";
import { assertSafeContent } from "./safety.js";

const MAX_FIELD_CHARS = 6000;
const MAX_ARRAY_ITEMS = 30;

export interface WriteCurrentContextInput {
  project: string;
  initiator?: "cursor" | "hermes" | "other";
  currentGoal: string;
  currentProject: string;
  confirmedFacts: string[];
  decisions: string[];
  completedWork: string[];
  modifiedFiles: string[];
  openRisks: string[];
  nextActions: string[];
  doNotRepeat: string[];
  minimalStartupPrompt: string;
  risk?: "low" | "medium" | "high";
}

export interface CurrentContextRecord extends Required<WriteCurrentContextInput> {
  updatedAt: string;
  version: string;
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label}_REQUIRED`);
  }
  if (normalized.length > MAX_FIELD_CHARS) {
    throw new Error(`${label}_TOO_LONG: max ${MAX_FIELD_CHARS} chars`);
  }
  return normalized;
}

function normalizeList(values: string[], label: string): string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${label}_REQUIRED`);
  }
  if (values.length > MAX_ARRAY_ITEMS) {
    throw new Error(`${label}_TOO_MANY_ITEMS: max ${MAX_ARRAY_ITEMS}`);
  }
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      if (value.length > MAX_FIELD_CHARS) {
        throw new Error(`${label}_ITEM_TOO_LONG: max ${MAX_FIELD_CHARS} chars`);
      }
      return value;
    });
}

function stateDir(project: string): string {
  const config = getProject(project);
  return path.join(config.contextRoot, "state");
}

function contextPaths(project: string) {
  const dir = stateDir(project);
  return {
    dir,
    markdown: path.join(dir, "current-context.md"),
    json: path.join(dir, "current-context.json"),
    archiveDir: path.join(dir, "archive")
  };
}

function timestampForFile(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function formatMarkdown(record: CurrentContextRecord): string {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n") || "- none";
  return [
    "# Current Context",
    "",
    `**Project**: ${record.project}`,
    `**Updated At**: ${record.updatedAt}`,
    `**Version**: ${record.version}`,
    `**Initiator**: ${record.initiator}`,
    `**Risk**: ${record.risk}`,
    "",
    "## Current Goal",
    record.currentGoal,
    "",
    "## Current Project",
    record.currentProject,
    "",
    "## Confirmed Facts",
    list(record.confirmedFacts),
    "",
    "## Decisions",
    list(record.decisions),
    "",
    "## Completed Work",
    list(record.completedWork),
    "",
    "## Modified Files",
    list(record.modifiedFiles),
    "",
    "## Open Risks",
    list(record.openRisks),
    "",
    "## Next Actions",
    list(record.nextActions),
    "",
    "## Do Not Repeat",
    list(record.doNotRepeat),
    "",
    "## Minimal Startup Prompt",
    record.minimalStartupPrompt,
    ""
  ].join("\n");
}

async function archiveIfExists(project: string): Promise<string | undefined> {
  const paths = contextPaths(project);
  try {
    await fs.access(paths.markdown);
  } catch {
    return undefined;
  }

  await fs.mkdir(paths.archiveDir, { recursive: true });
  const archivePath = path.join(paths.archiveDir, `${timestampForFile()}-current-context.md`);
  await fs.copyFile(paths.markdown, archivePath);
  return archivePath;
}

function normalizeRecord(input: WriteCurrentContextInput): CurrentContextRecord {
  const record: CurrentContextRecord = {
    project: input.project,
    initiator: input.initiator || "cursor",
    currentGoal: normalizeText(input.currentGoal, "CURRENT_GOAL"),
    currentProject: normalizeText(input.currentProject, "CURRENT_PROJECT"),
    confirmedFacts: normalizeList(input.confirmedFacts, "CONFIRMED_FACTS"),
    decisions: normalizeList(input.decisions, "DECISIONS"),
    completedWork: normalizeList(input.completedWork, "COMPLETED_WORK"),
    modifiedFiles: normalizeList(input.modifiedFiles, "MODIFIED_FILES"),
    openRisks: normalizeList(input.openRisks, "OPEN_RISKS"),
    nextActions: normalizeList(input.nextActions, "NEXT_ACTIONS"),
    doNotRepeat: normalizeList(input.doNotRepeat, "DO_NOT_REPEAT"),
    minimalStartupPrompt: normalizeText(input.minimalStartupPrompt, "MINIMAL_STARTUP_PROMPT"),
    risk: input.risk || "low",
    updatedAt: new Date().toISOString(),
    version: timestampForFile()
  };

  assertSafeContent(JSON.stringify(record));
  return record;
}

export async function writeCurrentContext(input: WriteCurrentContextInput): Promise<{
  ok: true;
  project: string;
  writtenTo: { markdown: string; json: string };
  archivedTo?: string;
  record: CurrentContextRecord;
}> {
  getProject(input.project);
  const record = normalizeRecord(input);
  const paths = contextPaths(input.project);
  const archivedTo = await archiveIfExists(input.project);
  await fs.mkdir(paths.dir, { recursive: true });
  await fs.writeFile(paths.markdown, formatMarkdown(record), "utf8");
  await fs.writeFile(paths.json, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return {
    ok: true,
    project: input.project,
    writtenTo: { markdown: paths.markdown, json: paths.json },
    archivedTo,
    record
  };
}

export async function getCurrentContext(project: string): Promise<{
  project: string;
  markdown: string;
  record?: CurrentContextRecord;
  source: { markdown: string; json: string };
}> {
  getProject(project);
  const paths = contextPaths(project);
  const markdown = await fs.readFile(paths.markdown, "utf8");
  let record: CurrentContextRecord | undefined;
  try {
    record = JSON.parse(await fs.readFile(paths.json, "utf8")) as CurrentContextRecord;
  } catch {
    record = undefined;
  }
  return { project, markdown, record, source: { markdown: paths.markdown, json: paths.json } };
}

export async function listCurrentContextVersions(project: string): Promise<{
  project: string;
  current?: string;
  versions: string[];
  archiveDir: string;
}> {
  getProject(project);
  const paths = contextPaths(project);
  let current: string | undefined;
  try {
    await fs.access(paths.markdown);
    current = paths.markdown;
  } catch {
    current = undefined;
  }

  let versions: string[] = [];
  try {
    const entries = await fs.readdir(paths.archiveDir, { withFileTypes: true });
    versions = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(paths.archiveDir, entry.name))
      .sort();
  } catch {
    versions = [];
  }

  return { project, current, versions, archiveDir: paths.archiveDir };
}

export async function archiveCurrentContext(project: string): Promise<{
  ok: true;
  project: string;
  archivedTo?: string;
}> {
  getProject(project);
  const archivedTo = await archiveIfExists(project);
  return { ok: true, project, archivedTo };
}
