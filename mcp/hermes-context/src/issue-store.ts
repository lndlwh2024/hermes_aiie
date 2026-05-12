import fs from "node:fs/promises";
import path from "node:path";
import { getProject } from "./config.js";
import { assertSafeContent } from "./safety.js";

export const ISSUE_STATUSES = ["open", "investigating", "fixed", "verified", "closed"] as const;
export const ISSUE_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const ISSUE_OWNERS = ["main", "pd", "ui", "as", "dev", "qa", "ad", "hermes", "other"] as const;
export const ISSUE_RISKS = ["low", "medium", "high"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type IssueOwner = (typeof ISSUE_OWNERS)[number];
export type IssueRisk = (typeof ISSUE_RISKS)[number];

export interface IssueRecord {
  project: string;
  issueId: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  version: string;
  occurredAt: string;
  updatedAt: string;
  impact: string;
  owner: IssueOwner;
  summary: string;
  currentConclusion: string;
  proposedSolution: string;
  nextValidation: string[];
  relatedFiles: string[];
  evidence: string[];
  risk: IssueRisk;
  finalFix?: string;
  verificationResult?: string;
  followUp?: string;
  history: IssueHistoryEntry[];
}

export interface IssueHistoryEntry {
  updatedAt: string;
  status: IssueStatus;
  summary: string;
}

export type UpsertIssueInput = Omit<IssueRecord, "issueId" | "updatedAt" | "history"> & {
  issueId?: string;
  updatedAt?: string;
};

export interface CloseIssueInput {
  project: string;
  issueId: string;
  finalFix: string;
  verificationResult: string;
  followUp?: string;
  updatedAt?: string;
}

interface IssueIndexEntry {
  issueId: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  version: string;
  occurredAt: string;
  updatedAt: string;
  impact: string;
  owner: IssueOwner;
  risk: IssueRisk;
  path: string;
}

function issuesRoot(project: string): string {
  return path.join(getProject(project).contextRoot, "issues");
}

function indexPath(project: string): string {
  return path.join(issuesRoot(project), "index.json");
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `issue-${Date.now()}`;
}

function normalizeIssueId(issueId: string): string {
  const normalized = slugify(issueId);
  if (!normalized) {
    throw new Error("ISSUE_ID_REQUIRED");
  }
  return normalized;
}

function issuePath(project: string, issueId: string): string {
  return path.join(issuesRoot(project), `${normalizeIssueId(issueId)}.md`);
}

function requireText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field.toUpperCase()}_REQUIRED`);
  }
  return trimmed;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function formatIssueMarkdown(issue: IssueRecord): string {
  return [
    `# ${issue.title}`,
    "",
    "## Metadata",
    "",
    `- Project: ${issue.project}`,
    `- Issue ID: ${issue.issueId}`,
    `- Status: ${issue.status}`,
    `- Priority: ${issue.priority}`,
    `- Version: ${issue.version}`,
    `- Occurred At: ${issue.occurredAt}`,
    `- Updated At: ${issue.updatedAt}`,
    `- Impact: ${issue.impact}`,
    `- Owner: ${issue.owner}`,
    `- Risk: ${issue.risk}`,
    "",
    "## Summary",
    "",
    issue.summary,
    "",
    "## Current Conclusion",
    "",
    issue.currentConclusion,
    "",
    "## Proposed Solution",
    "",
    issue.proposedSolution,
    "",
    "## Next Validation",
    "",
    formatList(issue.nextValidation),
    "",
    "## Related Files",
    "",
    formatList(issue.relatedFiles),
    "",
    "## Evidence",
    "",
    formatList(issue.evidence),
    "",
    "## Final Fix",
    "",
    issue.finalFix || "Pending",
    "",
    "## Verification Result",
    "",
    issue.verificationResult || "Pending",
    "",
    "## Follow Up",
    "",
    issue.followUp || "None",
    "",
    "## History",
    "",
    issue.history.map((entry) => `- ${entry.updatedAt} | ${entry.status} | ${entry.summary}`).join("\n") || "- None",
    ""
  ].join("\n");
}

async function readIssue(project: string, issueId: string): Promise<IssueRecord | undefined> {
  const filePath = issuePath(project, issueId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const match = raw.match(/<!--\s*hermes-issue-json\s*([\s\S]*?)\s*-->/);
    if (!match) {
      return undefined;
    }
    return JSON.parse(match[1]) as IssueRecord;
  } catch {
    return undefined;
  }
}

async function writeIssue(issue: IssueRecord): Promise<string> {
  const root = issuesRoot(issue.project);
  const filePath = issuePath(issue.project, issue.issueId);
  await fs.mkdir(root, { recursive: true });
  const jsonBlock = `<!-- hermes-issue-json\n${JSON.stringify(issue, null, 2)}\n-->\n\n`;
  await fs.writeFile(filePath, `${jsonBlock}${formatIssueMarkdown(issue)}`, "utf8");
  await rebuildIssueIndex(issue.project);
  return filePath;
}

async function listIssueFiles(project: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(issuesRoot(project), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => path.join(issuesRoot(project), entry.name));
  } catch {
    return [];
  }
}

async function readIssueFile(filePath: string): Promise<IssueRecord | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const match = raw.match(/<!--\s*hermes-issue-json\s*([\s\S]*?)\s*-->/);
    if (!match) {
      return undefined;
    }
    return JSON.parse(match[1]) as IssueRecord;
  } catch {
    return undefined;
  }
}

async function rebuildIssueIndex(project: string): Promise<IssueIndexEntry[]> {
  const config = getProject(project);
  const files = await listIssueFiles(project);
  const issues = (await Promise.all(files.map(readIssueFile))).filter((issue): issue is IssueRecord => Boolean(issue));
  const entries = issues
    .map((issue) => ({
      issueId: issue.issueId,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      version: issue.version,
      occurredAt: issue.occurredAt,
      updatedAt: issue.updatedAt,
      impact: issue.impact,
      owner: issue.owner,
      risk: issue.risk,
      path: path.relative(config.contextRoot, issuePath(project, issue.issueId)).replace(/\\/g, "/")
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.issueId.localeCompare(b.issueId));

  await fs.mkdir(issuesRoot(project), { recursive: true });
  await fs.writeFile(indexPath(project), `${JSON.stringify({ project, updatedAt: new Date().toISOString(), issues: entries }, null, 2)}\n`, "utf8");
  return entries;
}

function validateIssueSafety(issue: IssueRecord): void {
  assertSafeContent(JSON.stringify(issue));
}

export async function upsertIssue(input: UpsertIssueInput): Promise<{ ok: true; issue: IssueRecord; writtenTo: string; created: boolean }> {
  const issueId = normalizeIssueId(input.issueId || input.title);
  const existing = await readIssue(input.project, issueId);
  const updatedAt = input.updatedAt || new Date().toISOString();
  const issue: IssueRecord = {
    project: input.project,
    issueId,
    title: requireText(input.title, "title"),
    status: input.status,
    priority: input.priority,
    version: requireText(input.version, "version"),
    occurredAt: requireText(input.occurredAt, "occurredAt"),
    updatedAt,
    impact: requireText(input.impact, "impact"),
    owner: input.owner,
    summary: requireText(input.summary, "summary"),
    currentConclusion: requireText(input.currentConclusion, "currentConclusion"),
    proposedSolution: requireText(input.proposedSolution, "proposedSolution"),
    nextValidation: input.nextValidation,
    relatedFiles: input.relatedFiles,
    evidence: input.evidence,
    risk: input.risk,
    finalFix: input.finalFix,
    verificationResult: input.verificationResult,
    followUp: input.followUp,
    history: [
      ...(existing?.history || []),
      {
        updatedAt,
        status: input.status,
        summary: input.summary.slice(0, 240)
      }
    ]
  };

  validateIssueSafety(issue);
  const writtenTo = await writeIssue(issue);
  return { ok: true, issue, writtenTo, created: !existing };
}

export async function getIssue(project: string, issueId: string): Promise<{ ok: true; issue: IssueRecord; source: string }> {
  const issue = await readIssue(project, issueId);
  if (!issue) {
    throw new Error(`ISSUE_NOT_FOUND: ${issueId}`);
  }
  return { ok: true, issue, source: issuePath(project, issue.issueId) };
}

export async function listIssues(input: {
  project: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  limit?: number;
}): Promise<{ ok: true; project: string; issues: IssueIndexEntry[]; source: string }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const entries = await rebuildIssueIndex(input.project);
  const filtered = entries.filter((entry) => {
    if (input.status && entry.status !== input.status) return false;
    if (input.priority && entry.priority !== input.priority) return false;
    return true;
  });

  return {
    ok: true,
    project: input.project,
    issues: filtered.slice(0, limit),
    source: indexPath(input.project)
  };
}

export async function closeIssue(input: CloseIssueInput): Promise<{ ok: true; issue: IssueRecord; writtenTo: string }> {
  const current = await readIssue(input.project, input.issueId);
  if (!current) {
    throw new Error(`ISSUE_NOT_FOUND: ${input.issueId}`);
  }

  const updatedAt = input.updatedAt || new Date().toISOString();
  const issue: IssueRecord = {
    ...current,
    status: "closed",
    updatedAt,
    finalFix: requireText(input.finalFix, "finalFix"),
    verificationResult: requireText(input.verificationResult, "verificationResult"),
    followUp: input.followUp,
    history: [
      ...current.history,
      {
        updatedAt,
        status: "closed",
        summary: input.verificationResult.slice(0, 240)
      }
    ]
  };

  validateIssueSafety(issue);
  const writtenTo = await writeIssue(issue);
  return { ok: true, issue, writtenTo };
}
