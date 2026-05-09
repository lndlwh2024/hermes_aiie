import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { appendLesson, getProjectProfile, listContextSources, searchContext, syncProjectMirror } from "./context-store.js";
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
  "append_lesson",
  "Append a verified lesson or incident summary to Hermes context, optionally mirroring it into the project repository.",
  {
    project: z.string().min(1).default("news"),
    category: z.enum(["profile", "incidents", "lessons", "skills"]),
    title: z.string().min(1),
    content: z.string().min(1),
    mirror: z.boolean().default(true)
  },
  async (input) => {
    const result = await audited(
      "append_lesson",
      input.project,
      { ...input, content: `${input.content.slice(0, 200)}${input.content.length > 200 ? "..." : ""}` },
      () => appendLesson(input),
      undefined,
      (output) => output.mirroredTo || output.writtenTo
    );
    return textResponse(result);
  }
);

server.tool(
  "sync_project_mirror",
  "Synchronize selected Hermes project context files into the project mirror directory. Does not run git commands.",
  {
    project: z.string().min(1).default("news"),
    dryRun: z.boolean().default(true)
  },
  async (input) => {
    const result = await audited(
      "sync_project_mirror",
      input.project,
      input,
      () => syncProjectMirror(input),
      (output) => output.planned.map((item) => item.from),
      (output) => output.written.join("; ")
    );
    return textResponse(result);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
