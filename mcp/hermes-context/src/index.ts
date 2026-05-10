import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { appendAuditEntry, listAuditEntries, summarizeDailyAudit } from "./audit-trail-store.js";
import { appendLesson, getProjectProfile, listContextSources, routeContextNeed, searchContext } from "./context-store.js";
import { writeAudit } from "./audit.js";
import { summarizeInput } from "./safety.js";

const server = new McpServer({
  name: "hermes-context",
  version: "0.1.0"
});

function textResponse(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)
      }
    ]
  };
}

async function audited<T>(
  tool: string,
  project: string | undefined,
  input: unknown,
  fn: () => Promise<T>,
  sources?: (result: T) => string[],
  target?: (result: T) => string | undefined
) {
  try {
    const result = await fn();
    await writeAudit({
      tool,
      project,
      inputSummary: summarizeInput(input),
      sources: sources?.(result),
      target: target?.(result),
      status: "success"
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeAudit({
      tool,
      project,
      inputSummary: summarizeInput(input),
      status: message.startsWith("SENSITIVE_CONTENT_BLOCKED") ? "blocked" : "error",
      error: message
    });
    throw error;
  }
}

server.tool(
  "get_project_profile",
  "Read a short project profile from Hermes context. Use early for project-aware tasks.",
  {
    project: z.string().min(1).default("news")
  },
  async (input) => {
    const result = await audited(
      "get_project_profile",
      input.project,
      input,
      () => getProjectProfile(input.project),
      (output) => [output.source]
    );
    return textResponse(result);
  }
);

server.tool(
  "list_context_sources",
  "List available Hermes context markdown sources for a project.",
  {
    project: z.string().min(1).default("news")
  },
  async (input) => {
    const result = await audited(
      "list_context_sources",
      input.project,
      input,
      () => listContextSources(input.project),
      (output) => output.sources.map((source) => source.path)
    );
    return textResponse(result);
  }
);

server.tool(
  "search_context",
  "Search project Hermes context docs by keyword and return relevant snippets, not full files.",
  {
    project: z.string().min(1).default("news"),
    query: z.string().min(1),
    category: z.string().optional(),
    limit: z.number().int().positive().max(10).default(5)
  },
  async (input) => {
    const result = await audited(
      "search_context",
      input.project,
      input,
      () => searchContext(input),
      (output) => output.matches.map((match) => match.source)
    );
    return textResponse(result);
  }
);

server.tool(
  "route_context_need",
  "Decide whether a user request should search project context, based on generic and project-defined triggers.",
  {
    project: z.string().min(1).default("news"),
    request: z.string().min(1)
  },
  async (input) => {
    const result = await audited(
      "route_context_need",
      input.project,
      input,
      () => routeContextNeed(input)
    );
    return textResponse(result);
  }
);

server.tool(
  "append_lesson",
  "Append a verified lesson or incident summary directly into the registered project's hermes directory.",
  {
    project: z.string().min(1).default("news"),
    category: z.enum(["profile", "incidents", "lessons", "skills"]),
    title: z.string().min(1),
    content: z.string().min(1),
    dedupe: z.boolean().default(true)
  },
  async (input) => {
    const result = await audited(
      "append_lesson",
      input.project,
      { ...input, content: `${input.content.slice(0, 200)}${input.content.length > 200 ? "..." : ""}` },
      () => appendLesson(input),
      undefined,
      (output) => output.writtenTo
    );
    return textResponse(result);
  }
);

server.tool(
  "append_audit_entry",
  "Append a work-log entry to the local Hermes audit trail. This tool only writes under AppData/Local/hermes/audit-trail and never runs code.",
  {
    scope: z.enum(["global", "project"]).default("project"),
    project: z.string().optional(),
    actionType: z.enum(["analysis", "doc_update", "code_change", "test", "config_change", "verification", "rollback", "other"]),
    target: z.string().min(1),
    summary: z.string().min(1),
    result: z.string().min(1),
    risk: z.enum(["low", "medium", "high"]).default("low"),
    evidence: z.string().optional(),
    followUp: z.string().optional()
  },
  async (input) => {
    const result = await audited(
      "append_audit_entry",
      input.project,
      { ...input, result: `${input.result.slice(0, 200)}${input.result.length > 200 ? "..." : ""}` },
      () => appendAuditEntry(input),
      undefined,
      (output) => output.writtenTo.markdown
    );
    return textResponse(result);
  }
);

server.tool(
  "list_audit_entries",
  "List local Hermes audit-trail entries for one date. Reads only from AppData/Local/hermes/audit-trail.",
  {
    scope: z.enum(["global", "project"]).default("project"),
    project: z.string().optional(),
    date: z.string().optional(),
    limit: z.number().int().positive().max(100).default(20)
  },
  async (input) => {
    const result = await audited(
      "list_audit_entries",
      input.project,
      input,
      () => listAuditEntries(input),
      (output) => [output.source]
    );
    return textResponse(result);
  }
);

server.tool(
  "summarize_daily_audit",
  "Summarize local Hermes audit-trail entries for one date without reading arbitrary files.",
  {
    scope: z.enum(["global", "project"]).default("project"),
    project: z.string().optional(),
    date: z.string().optional()
  },
  async (input) => {
    const result = await audited(
      "summarize_daily_audit",
      input.project,
      input,
      () => summarizeDailyAudit(input),
      (output) => [output.source]
    );
    return textResponse(result);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
