import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { appendAuditEntry, listAuditEntries, summarizeDailyAudit } from "./audit-trail-store.js";
import { appendLesson, getProjectProfile, listContextSources, routeContextNeed, searchContext } from "./context-store.js";
import { archiveCurrentContext, getCurrentContext, listCurrentContextVersions, writeCurrentContext } from "./current-context-store.js";
import { closeIssue, getIssue, listIssues, upsertIssue } from "./issue-store.js";
import { writeAudit } from "./audit.js";
import { sendActionNotification } from "./notify.js";
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

const notificationToolLabels: Record<string, string> = {
  append_lesson: "项目经验写回",
  append_audit_entry: "工作日志写入",
  write_current_context: "当前上下文写入",
  archive_current_context: "当前上下文归档",
  upsert_issue: "问题台账写入",
  close_issue: "问题台账关闭"
};

const notificationTriggerLabels: Record<string, string> = {
  profile: "项目概况",
  incidents: "故障复盘",
  lessons: "项目经验",
  skills: "项目技能",
  issues: "进行中问题",
  "audit-trail": "工作日志",
  "current-context": "当前上下文"
};

server.resource(
  "hermes-context-capabilities",
  "hermes-context://capabilities",
  {
    title: "Hermes Context Capabilities",
    description: "Lists available hermes-context tools and their boundaries.",
    mimeType: "application/json"
  },
  (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            server: "hermes-context",
            tools: [
              "get_project_profile",
              "list_context_sources",
              "route_context_need",
              "search_context",
              "append_lesson",
              "append_audit_entry",
              "list_audit_entries",
              "summarize_daily_audit",
              "write_current_context",
              "get_current_context",
              "list_current_context_versions",
              "archive_current_context",
              "upsert_issue",
              "get_issue",
              "list_issues",
              "close_issue"
            ],
            writes: {
              auditTrail: "AppData/Local/hermes/audit-trail",
              currentContext: "<project-root>/hermes/state",
              lessons: "<project-root>/hermes/<category>",
              issues: "<project-root>/hermes/issues"
            },
            safety: [
              "No Python, terminal, arbitrary file, or code execution permission is required.",
              "Write tools run sensitive-content checks before persistence.",
              "Successful write tools send Telegram action notifications from MCP."
            ]
          },
          null,
          2
        )
      }
    ]
  })
);

server.prompt(
  "current_context_handoff",
  "Guide Hermes/Cursor to maintain and consume the compact current-context snapshot.",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Use mcp_hermes_context_write_current_context when Cursor has first-hand context to persist.",
            "Use mcp_hermes_context_get_current_context at the start of a new session to avoid rereading long history.",
            "Do not ask for Python, terminal, file, or code_execution permission for this workflow.",
            "Treat Telegram notification as immediate feedback, not the canonical record."
          ].join("\n")
        }
      }
    ]
  })
);

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
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor"),
    risk: z.enum(["low", "medium", "high"]).default("low"),
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
    const notification = await sendActionNotification({
      project: input.project,
      triggerType: input.category,
      triggerLabel: notificationTriggerLabels[input.category],
      initiator: input.initiator,
      toolName: "mcp_hermes_context_append_lesson",
      toolLabel: notificationToolLabels.append_lesson,
      result: "success",
      path: result.writtenTo,
      risk: input.risk
    });
    return textResponse({ ...result, notification });
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
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor"),
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
    const notification = await sendActionNotification({
      project: result.entry.project,
      triggerType: "audit-trail",
      triggerLabel: notificationTriggerLabels["audit-trail"],
      initiator: input.initiator,
      toolName: "mcp_hermes_context_append_audit_entry",
      toolLabel: notificationToolLabels.append_audit_entry,
      result: "success",
      path: result.writtenTo.markdown,
      risk: result.entry.risk
    });
    return textResponse({ ...result, notification });
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

server.tool(
  "write_current_context",
  "Write the compact current context snapshot for a project, archive the previous snapshot, and notify Telegram.",
  {
    project: z.string().min(1).default("news"),
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor"),
    currentGoal: z.string().min(1),
    currentProject: z.string().min(1),
    confirmedFacts: z.array(z.string()).default([]),
    decisions: z.array(z.string()).default([]),
    completedWork: z.array(z.string()).default([]),
    modifiedFiles: z.array(z.string()).default([]),
    openRisks: z.array(z.string()).default([]),
    nextActions: z.array(z.string()).default([]),
    doNotRepeat: z.array(z.string()).default([]),
    minimalStartupPrompt: z.string().min(1),
    risk: z.enum(["low", "medium", "high"]).default("low")
  },
  async (input) => {
    const result = await audited(
      "write_current_context",
      input.project,
      { ...input, minimalStartupPrompt: `${input.minimalStartupPrompt.slice(0, 200)}${input.minimalStartupPrompt.length > 200 ? "..." : ""}` },
      () => writeCurrentContext(input),
      undefined,
      (output) => output.writtenTo.markdown
    );
    const notification = await sendActionNotification({
      project: input.project,
      triggerType: "current-context",
      triggerLabel: notificationTriggerLabels["current-context"],
      initiator: input.initiator,
      toolName: "mcp_hermes_context_write_current_context",
      toolLabel: notificationToolLabels.write_current_context,
      result: "success",
      path: result.writtenTo.markdown,
      risk: input.risk
    });
    return textResponse({ ...result, notification });
  }
);

server.tool(
  "get_current_context",
  "Read the compact current context snapshot for a project.",
  {
    project: z.string().min(1).default("news")
  },
  async (input) => {
    const result = await audited(
      "get_current_context",
      input.project,
      input,
      () => getCurrentContext(input.project),
      (output) => [output.source.markdown, output.source.json]
    );
    return textResponse(result);
  }
);

server.tool(
  "list_current_context_versions",
  "List archived current-context snapshots for a project.",
  {
    project: z.string().min(1).default("news")
  },
  async (input) => {
    const result = await audited(
      "list_current_context_versions",
      input.project,
      input,
      () => listCurrentContextVersions(input.project),
      (output) => [output.archiveDir]
    );
    return textResponse(result);
  }
);

server.tool(
  "archive_current_context",
  "Archive the current context snapshot for a project without changing it.",
  {
    project: z.string().min(1).default("news"),
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor"),
    risk: z.enum(["low", "medium", "high"]).default("low")
  },
  async (input) => {
    const result = await audited(
      "archive_current_context",
      input.project,
      input,
      () => archiveCurrentContext(input.project),
      undefined,
      (output) => output.archivedTo
    );
    const notification = result.archivedTo
      ? await sendActionNotification({
        project: input.project,
        triggerType: "current-context",
        triggerLabel: notificationTriggerLabels["current-context"],
        initiator: input.initiator,
        toolName: "mcp_hermes_context_archive_current_context",
        toolLabel: notificationToolLabels.archive_current_context,
        result: "success",
        path: result.archivedTo,
        risk: input.risk
      })
      : { ok: false, skipped: true, error: "no current context to archive" };
    return textResponse({ ...result, notification });
  }
);

server.tool(
  "upsert_issue",
  "Create or update a project issue ledger entry under <project-root>/hermes/issues and notify Telegram.",
  {
    project: z.string().min(1).default("news"),
    issueId: z.string().optional(),
    title: z.string().min(1),
    status: z.enum(["open", "investigating", "fixed", "verified", "closed"]),
    priority: z.enum(["P0", "P1", "P2", "P3"]),
    version: z.string().min(1),
    occurredAt: z.string().min(1),
    impact: z.string().min(1),
    owner: z.enum(["main", "pd", "ui", "as", "dev", "qa", "ad", "hermes", "other"]),
    summary: z.string().min(1),
    currentConclusion: z.string().min(1),
    proposedSolution: z.string().min(1),
    nextValidation: z.array(z.string()).default([]),
    relatedFiles: z.array(z.string()).default([]),
    evidence: z.array(z.string()).default([]),
    risk: z.enum(["low", "medium", "high"]),
    finalFix: z.string().optional(),
    verificationResult: z.string().optional(),
    followUp: z.string().optional(),
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor")
  },
  async (input) => {
    const { initiator, ...issueInput } = input;
    const result = await audited(
      "upsert_issue",
      input.project,
      { ...input, summary: `${input.summary.slice(0, 200)}${input.summary.length > 200 ? "..." : ""}` },
      () => upsertIssue(issueInput),
      undefined,
      (output) => output.writtenTo
    );
    const notification = await sendActionNotification({
      project: input.project,
      triggerType: "issues",
      triggerLabel: notificationTriggerLabels.issues,
      initiator,
      toolName: "mcp_hermes_context_upsert_issue",
      toolLabel: notificationToolLabels.upsert_issue,
      result: "success",
      path: result.writtenTo,
      risk: input.risk
    });
    return textResponse({ ...result, notification });
  }
);

server.tool(
  "get_issue",
  "Read one project issue ledger entry by issueId.",
  {
    project: z.string().min(1).default("news"),
    issueId: z.string().min(1)
  },
  async (input) => {
    const result = await audited(
      "get_issue",
      input.project,
      input,
      () => getIssue(input.project, input.issueId),
      (output) => [output.source]
    );
    return textResponse(result);
  }
);

server.tool(
  "list_issues",
  "List project issue ledger entries, optionally filtered by status or priority.",
  {
    project: z.string().min(1).default("news"),
    status: z.enum(["open", "investigating", "fixed", "verified", "closed"]).optional(),
    priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
    limit: z.number().int().positive().max(200).default(50)
  },
  async (input) => {
    const result = await audited(
      "list_issues",
      input.project,
      input,
      () => listIssues(input),
      (output) => [output.source]
    );
    return textResponse(result);
  }
);

server.tool(
  "close_issue",
  "Close a project issue ledger entry with final fix and verification result, then notify Telegram.",
  {
    project: z.string().min(1).default("news"),
    issueId: z.string().min(1),
    finalFix: z.string().min(1),
    verificationResult: z.string().min(1),
    followUp: z.string().optional(),
    initiator: z.enum(["cursor", "hermes", "other"]).default("cursor")
  },
  async (input) => {
    const { initiator, ...closeInput } = input;
    const result = await audited(
      "close_issue",
      input.project,
      input,
      () => closeIssue(closeInput),
      undefined,
      (output) => output.writtenTo
    );
    const notification = await sendActionNotification({
      project: input.project,
      triggerType: "issues",
      triggerLabel: notificationTriggerLabels.issues,
      initiator,
      toolName: "mcp_hermes_context_close_issue",
      toolLabel: notificationToolLabels.close_issue,
      result: "success",
      path: result.writtenTo,
      risk: result.issue.risk
    });
    return textResponse({ ...result, notification });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
