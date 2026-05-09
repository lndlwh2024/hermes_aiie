import fs from "node:fs/promises";
import path from "node:path";
import { ALLOWED_CATEGORIES, type ContextCategory, getProject, type ProjectConfig } from "./config.js";
import { scoreContent, type SearchMatch } from "./search.js";
import { assertSafeContent } from "./safety.js";

export interface ContextSource {
  path: string;
  category: string;
  size: number;
  origin: "context" | "mirror";
}

export interface AppendLessonInput {
  project: string;
  category: ContextCategory;
  title: string;
  content: string;
  mirror?: boolean;
}

export interface AppendLessonResult {
  ok: true;
  writtenTo: string;
  mirroredTo?: string;
}

const CATEGORY_TO_CONTEXT_FILE: Record<ContextCategory, string> = {
  profile: "project-profile.md",
  incidents: "incident-log.md",
  lessons: "incident-log.md",
  skills: "incident-log.md"
};

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

async function readableRoots(config: ProjectConfig): Promise<Array<{ origin: "context" | "mirror"; root: string }>> {
  const candidates: Array<{ origin: "context" | "mirror"; root: string }> = [
    { origin: "context", root: config.contextRoot },
    { origin: "mirror", root: config.mirrorRoot }
  ];
  const roots: Array<{ origin: "context" | "mirror"; root: string }> = [];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate.root);
      if (stat.isDirectory()) {
        roots.push(candidate);
      }
    } catch {
      // Missing mirror/context roots are ignored; project config still controls allowed paths.
    }
  }

  return roots;
}

function mirrorCategoryPath(config: ProjectConfig, category: ContextCategory, title: string): string {
  if (category === "profile") {
    return path.join(config.mirrorRoot, "profile", "project-profile.md");
  }
  return path.join(config.mirrorRoot, category, `${slugify(title)}.md`);
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
  const roots = await readableRoots(config);
  const sources: ContextSource[] = [];

  for (const { origin, root } of roots) {
    const files = await listMarkdownFiles(root);
    for (const file of files) {
      const rel = relativeTo(root, file);
      const stat = await fs.stat(file);
      sources.push({
        path: `${origin}:${rel}`,
        category: path.dirname(rel).split("/")[0] || "root",
        size: stat.size,
        origin
      });
    }
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
  const roots = await readableRoots(config);
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const category = input.category?.trim();
  const matches: SearchMatch[] = [];

  for (const { origin, root } of roots) {
    const files = await listMarkdownFiles(root);
    for (const file of files) {
      const rel = relativeTo(root, file);
      if (category && !rel.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }
      const content = await fs.readFile(file, "utf8");
      const source = `${origin}:${rel}`;
      const match = scoreContent(source, content, input.query);
      if (match) {
        matches.push(match);
      }
    }
  }

  matches.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));
  return { project: input.project, query: input.query, matches: matches.slice(0, limit) };
}

export async function appendLesson(input: AppendLessonInput): Promise<AppendLessonResult> {
  assertCategory(input.category);
  const config = getProject(input.project);
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title) throw new Error("TITLE_REQUIRED");
  if (!content) throw new Error("CONTENT_REQUIRED");

  assertSafeContent(`${title}\n${content}`);

  const contextFile = path.join(config.contextRoot, CATEGORY_TO_CONTEXT_FILE[input.category]);
  await fs.mkdir(path.dirname(contextFile), { recursive: true });
  await fs.appendFile(contextFile, formatLesson(title, content), "utf8");

  let mirroredTo: string | undefined;
  if (input.mirror) {
    const mirrorFile = await uniquePath(mirrorCategoryPath(config, input.category, title));
    await fs.mkdir(path.dirname(mirrorFile), { recursive: true });
    await fs.writeFile(mirrorFile, `# ${title}\n\n${content}\n`, "utf8");
    mirroredTo = mirrorFile;
  }

  return { ok: true, writtenTo: contextFile, mirroredTo };
}

export async function syncProjectMirror(input: {
  project: string;
  dryRun?: boolean;
}): Promise<{ project: string; dryRun: boolean; planned: Array<{ from: string; to: string }>; written: string[] }> {
  const config = getProject(input.project);
  const dryRun = input.dryRun ?? true;
  const planned = [
    {
      from: path.join(config.contextRoot, "project-profile.md"),
      to: path.join(config.mirrorRoot, "profile", "project-profile.md")
    },
    {
      from: path.join(config.contextRoot, "incident-log.md"),
      to: path.join(config.mirrorRoot, "incidents", "incident-log.md")
    },
    {
      from: path.join(config.contextRoot, "deployment-lessons.md"),
      to: path.join(config.mirrorRoot, "lessons", "deployment-lessons.md")
    },
    {
      from: path.join(config.contextRoot, "supabase-lessons.md"),
      to: path.join(config.mirrorRoot, "lessons", "supabase-lessons.md")
    },
    {
      from: path.join(config.contextRoot, "hermes-lessons.md"),
      to: path.join(config.mirrorRoot, "lessons", "hermes-lessons.md")
    }
  ];

  const written: string[] = [];
  if (!dryRun) {
    for (const item of planned) {
      const content = await fs.readFile(item.from, "utf8");
      assertSafeContent(content);
      await fs.mkdir(path.dirname(item.to), { recursive: true });
      await fs.writeFile(item.to, content, "utf8");
      written.push(item.to);
    }
  }

  return { project: input.project, dryRun, planned, written };
}
