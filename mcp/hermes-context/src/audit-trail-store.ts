import fs from "node:fs/promises";
import path from "node:path";
import { AUDIT_TRAIL_ROOT } from "./config.js";
import { assertSafeContent } from "./safety.js";

const MAX_FIELD_CHARS = 2000;
const MAX_LIST_LIMIT = 100;

const ACTION_TYPES = [
  "analysis",
  "doc_update",
  "code_change",
  "test",
  "config_change",
  "verification",
  "rollback",
  "other"
] as const;

const RISKS = ["low", "medium", "high"] as const;

export type AuditActionType = (typeof ACTION_TYPES)[number];
export type AuditRisk = (typeof RISKS)[number];
export type AuditScope = "global" | "project";

export interface AppendAuditEntryInput {
  scope: AuditScope;
  project?: string;
  actionType: AuditActionType;
  target: string;
  summary: string;
  result: string;
  risk?: AuditRisk;
  evidence?: string;
  followUp?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  scope: AuditScope;
  project?: string;
  actionType: AuditActionType;
  target: string;
  summary: string;
  result: string;
  risk: AuditRisk;
  evidence: string;
  followUp: string;
}

function assertEnum<T extends string>(value: string, allowed: readonly T[], label: string): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${label}_NOT_ALLOWED: ${value}`);
  }
}

function safeSlug(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
    throw new Error(`${label}_INVALID: use 1-64 chars of letters, numbers, underscore, or hyphen`);
  }
  return trimmed;
}

function normalizeField(value: string | undefined, label: string, fallback = "none"): string {
  const normalized = (value || fallback).trim();
  if (!normalized) {
    throw new Error(`${label}_REQUIRED`);
  }
  if (normalized.length > MAX_FIELD_CHARS) {
    throw new Error(`${label}_TOO_LONG: max ${MAX_FIELD_CHARS} chars`);
  }
  return normalized;
}

function datePart(ts: string): string {
  return ts.slice(0, 10);
}

function scopeDir(scope: AuditScope, project?: string): string {
  if (scope === "global") {
    return path.join(AUDIT_TRAIL_ROOT, "global");
  }
  if (!project) {
    throw new Error("PROJECT_REQUIRED_FOR_PROJECT_SCOPE");
  }
  return path.join(AUDIT_TRAIL_ROOT, "projects", safeSlug(project, "PROJECT"));
}

function dailyPaths(entry: Pick<AuditEntry, "scope" | "project" | "ts">): { markdown: string; jsonl: string } {
  const dir = scopeDir(entry.scope, entry.project);
  const day = datePart(entry.ts);
  return {
    markdown: path.join(dir, `${day}.md`),
    jsonl: path.join(dir, `${day}.jsonl`)
  };
}

function formatMarkdownEntry(entry: AuditEntry): string {
  return [
    "",
    `## ${entry.ts} ${entry.actionType}`,
    "",
    `- ID: ${entry.id}`,
    `- Scope: ${entry.scope}`,
    `- Project: ${entry.project || "global"}`,
    `- Target: ${entry.target}`,
    `- Risk: ${entry.risk}`,
    `- Summary: ${entry.summary}`,
    `- Result: ${entry.result}`,
    `- Evidence: ${entry.evidence}`,
    `- Follow-up: ${entry.followUp}`,
    ""
  ].join("\n");
}

async function ensureDailyHeader(markdownPath: string, entry: AuditEntry): Promise<void> {
  try {
    await fs.access(markdownPath);
  } catch {
    const titleProject = entry.scope === "global" ? "global" : entry.project;
    await fs.writeFile(
      markdownPath,
      `# Hermes Audit Trail ${datePart(entry.ts)} (${titleProject})\n`,
      "utf8"
    );
  }
}

function normalizeEntry(input: AppendAuditEntryInput): AuditEntry {
  const scope = input.scope;
  assertEnum(scope, ["global", "project"], "SCOPE");
  assertEnum(input.actionType, ACTION_TYPES, "ACTION_TYPE");
  const risk = input.risk || "low";
  assertEnum(risk, RISKS, "RISK");

  const project = scope === "project" ? safeSlug(input.project || "", "PROJECT") : undefined;
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ts: new Date().toISOString(),
    scope,
    project,
    actionType: input.actionType,
    target: normalizeField(input.target, "TARGET"),
    summary: normalizeField(input.summary, "SUMMARY"),
    result: normalizeField(input.result, "RESULT"),
    risk,
    evidence: normalizeField(input.evidence, "EVIDENCE"),
    followUp: normalizeField(input.followUp, "FOLLOW_UP")
  };

  assertSafeContent(JSON.stringify(entry));
  return entry;
}

export async function appendAuditEntry(input: AppendAuditEntryInput): Promise<{
  ok: true;
  entry: AuditEntry;
  writtenTo: { markdown: string; jsonl: string };
}> {
  const entry = normalizeEntry(input);
  const paths = dailyPaths(entry);
  await fs.mkdir(path.dirname(paths.markdown), { recursive: true });
  await ensureDailyHeader(paths.markdown, entry);
  await fs.appendFile(paths.markdown, formatMarkdownEntry(entry), "utf8");
  await fs.appendFile(paths.jsonl, `${JSON.stringify(entry)}\n`, "utf8");
  return { ok: true, entry, writtenTo: paths };
}

function parseDate(value: string | undefined): string {
  if (!value) {
    return datePart(new Date().toISOString());
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("DATE_INVALID: expected YYYY-MM-DD");
  }
  return value;
}

export async function listAuditEntries(input: {
  scope: AuditScope;
  project?: string;
  date?: string;
  limit?: number;
}): Promise<{ scope: AuditScope; project?: string; date: string; entries: AuditEntry[]; source: string }> {
  assertEnum(input.scope, ["global", "project"], "SCOPE");
  const project = input.scope === "project" ? safeSlug(input.project || "", "PROJECT") : undefined;
  const date = parseDate(input.date);
  const source = path.join(scopeDir(input.scope, project), `${date}.jsonl`);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), MAX_LIST_LIMIT);

  try {
    const raw = await fs.readFile(source, "utf8");
    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry)
      .slice(-limit);
    return { scope: input.scope, project, date, entries, source };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      return { scope: input.scope, project, date, entries: [], source };
    }
    throw error;
  }
}

export async function summarizeDailyAudit(input: {
  scope: AuditScope;
  project?: string;
  date?: string;
}): Promise<{
  scope: AuditScope;
  project?: string;
  date: string;
  total: number;
  byActionType: Record<string, number>;
  byRisk: Record<string, number>;
  unresolvedFollowUps: Array<{ id: string; summary: string; followUp: string }>;
  source: string;
}> {
  const listed = await listAuditEntries({ ...input, limit: MAX_LIST_LIMIT });
  const byActionType: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  const unresolvedFollowUps: Array<{ id: string; summary: string; followUp: string }> = [];

  for (const entry of listed.entries) {
    byActionType[entry.actionType] = (byActionType[entry.actionType] || 0) + 1;
    byRisk[entry.risk] = (byRisk[entry.risk] || 0) + 1;
    if (entry.followUp && entry.followUp.toLowerCase() !== "none") {
      unresolvedFollowUps.push({ id: entry.id, summary: entry.summary, followUp: entry.followUp });
    }
  }

  return {
    scope: listed.scope,
    project: listed.project,
    date: listed.date,
    total: listed.entries.length,
    byActionType,
    byRisk,
    unresolvedFollowUps,
    source: listed.source
  };
}
