import fs from "node:fs/promises";
import path from "node:path";
import { ALLOWED_CATEGORIES, type ContextCategory, getProject, type ProjectConfig } from "./config.js";
import { scoreContent, type SearchMatch } from "./search.js";
import { assertSafeContent } from "./safety.js";

export interface ContextSource {
  path: string;
  category: string;
  size: number;
}

export interface AppendLessonInput {
  project: string;
  category: ContextCategory;
  title: string;
  content: string;
  dedupe?: boolean;
}

export interface AppendLessonResult {
  ok: true;
  writtenTo: string;
  duplicate?: boolean;
}

export interface RouteContextNeedInput {
  project: string;
  request: string;
}

export interface RouteContextNeedResult {
  project: string;
  needsContext: boolean;
  reason: string;
  query?: string;
  category?: ContextCategory;
  matchedKeywords: string[];
}

const CATEGORY_TO_DIR: Record<ContextCategory, string> = {
  profile: "profile",
  incidents: "incidents",
  lessons: "lessons",
  skills: "skills"
};

const GENERIC_CONTEXT_KEYWORDS = [
  "之前",
  "又出现",
  "回滚后",
  "曾经修过",
  "历史",
  "复盘",
  "故障",
  "报错",
  "失败",
  "部署",
  "数据库",
  "鉴权",
  "监控",
  "rollback",
  "history",
  "incident",
  "regression",
  "again",
  "previous",
  "deployment",
  "database",
  "auth",
  "monitoring"
];

function assertCategory(category: string): asserts category is ContextCategory {
  if (!ALLOWED_CATEGORIES.includes(category as ContextCategory)) {
    throw new Error(`CATEGORY_NOT_ALLOWED: ${category}`);
  }
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `lesson-${Date.now()}`;
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(full);
    }
  }

  return files;
}

function relativeTo(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function contextCategoryPath(config: ProjectConfig, category: ContextCategory, title: string): string {
  if (category === "profile") {
    return path.join(config.contextRoot, "profile", "project-profile.md");
  }
  return path.join(config.contextRoot, CATEGORY_TO_DIR[category], `${slugify(title)}.md`);
}

async function uniquePath(basePath: string): Promise<string> {
  try {
    await fs.access(basePath);
  } catch {
    return basePath;
  }

  const parsed = path.parse(basePath);
  return path.join(parsed.dir, `${parsed.name}-${new Date().toISOString().replace(/[:.]/g, "-")}${parsed.ext}`);
}

function formatLesson(title: string, content: string): string {
  return [
    "",
    "---",
    "",
    `## ${title}`,
    "",
    `**Recorded At**: ${new Date().toISOString()}`,
    "",
    content.trim(),
    ""
  ].join("\n");
}

export async function getProjectProfile(project: string): Promise<{ project: string; profile: string; source: string }> {
  const config = getProject(project);
  const source = path.join(config.contextRoot, config.profileFile);
  const raw = await fs.readFile(source, "utf8");
  const profile = raw.length > 1200 ? `${raw.slice(0, 1200)}...` : raw;
  return { project, profile, source };
}

export async function listContextSources(project: string): Promise<{ project: string; sources: ContextSource[] }> {
  const config = getProject(project);
  const sources: ContextSource[] = [];
  const files = await listMarkdownFiles(config.contextRoot);

  for (const file of files) {
    const rel = relativeTo(config.contextRoot, file);
    const stat = await fs.stat(file);
    sources.push({
      path: rel,
      category: path.dirname(rel).split("/")[0] || "root",
      size: stat.size
    });
  }

  return { project, sources };
}

export async function searchContext(input: {
  project: string;
  query: string;
  category?: string;
  limit?: number;
}): Promise<{ project: string; query: string; matches: SearchMatch[] }> {
  const config = getProject(input.project);
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const category = input.category?.trim();
  const matches: SearchMatch[] = [];

  const files = await listMarkdownFiles(config.contextRoot);
  for (const file of files) {
    const rel = relativeTo(config.contextRoot, file);
    if (category && !rel.toLowerCase().includes(category.toLowerCase())) {
      continue;
    }
    const content = await fs.readFile(file, "utf8");
    const match = scoreContent(rel, content, input.query);
    if (match) {
      matches.push(match);
    }
  }

  matches.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));
  return { project: input.project, query: input.query, matches: matches.slice(0, limit) };
}

async function readOptional(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function extractKeywordSection(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const keywords: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (/^#{1,3}\s+(Context Trigger Keywords|Trigger|触发条件|触发关键词)/i.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,3}\s+/.test(line.trim())) {
      inSection = false;
    }
    if (!inSection) {
      continue;
    }
    const item = line.replace(/^[-*]\s*/, "").trim();
    if (item) {
      keywords.push(item);
    }
  }

  return keywords;
}

function chooseCategory(request: string): ContextCategory {
  const lower = request.toLowerCase();
  if (/skill|技能/.test(lower)) return "skills";
  if (/profile|概况|规则/.test(lower)) return "profile";
  if (/lesson|经验|总结/.test(lower)) return "lessons";
  return "incidents";
}

export async function routeContextNeed(input: RouteContextNeedInput): Promise<RouteContextNeedResult> {
  const config = getProject(input.project);
  const request = input.request.trim();
  if (!request) {
    throw new Error("REQUEST_REQUIRED");
  }

  const profile = await readOptional(path.join(config.contextRoot, config.profileFile));
  const skillFiles = await listMarkdownFiles(path.join(config.contextRoot, "skills")).catch(() => []);
  const skillContents = await Promise.all(skillFiles.map((file) => readOptional(file)));
  const projectKeywords = [
    ...extractKeywordSection(profile),
    ...skillContents.flatMap(extractKeywordSection)
  ];
  const keywords = [...new Set([...GENERIC_CONTEXT_KEYWORDS, ...projectKeywords].map((item) => item.trim()).filter(Boolean))];
  const lowerRequest = request.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) => lowerRequest.includes(keyword.toLowerCase()));
  const needsContext = matchedKeywords.length > 0;

  return {
    project: input.project,
    needsContext,
    reason: needsContext
      ? `Matched context trigger keyword(s): ${matchedKeywords.join(", ")}.`
      : "No project or history-sensitive trigger keyword matched.",
    query: needsContext ? request : undefined,
    category: needsContext ? chooseCategory(request) : undefined,
    matchedKeywords
  };
}

export async function appendLesson(input: AppendLessonInput): Promise<AppendLessonResult> {
  assertCategory(input.category);
  const config = getProject(input.project);
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) throw new Error("TITLE_REQUIRED");
  if (!content) throw new Error("CONTENT_REQUIRED");

  assertSafeContent(`${title}\n${content}`);

  const contextFile = await uniquePath(contextCategoryPath(config, input.category, title));
  if (input.dedupe ?? true) {
    const existing = await searchContext({ project: input.project, query: title, category: input.category, limit: 3 });
    const duplicate = existing.matches.some((match) => match.snippet.includes(content.slice(0, Math.min(content.length, 120))));
    if (duplicate) {
      return { ok: true, writtenTo: existing.matches[0]?.source || contextFile, duplicate: true };
    }
  }

  await fs.mkdir(path.dirname(contextFile), { recursive: true });
  await fs.writeFile(contextFile, `# ${title}\n\n${content}\n`, "utf8");
  return { ok: true, writtenTo: contextFile };
}
