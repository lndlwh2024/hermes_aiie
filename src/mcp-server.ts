import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createTask, listTasks, updateTaskStatus } from "./queue.js";

const server = new McpServer({
  name: "hermes-task-queue",
  version: "0.1.0"
});

server.resource(
  "hermes-task-queue-capabilities",
  "hermes-task-queue://capabilities",
  {
    title: "Hermes Task Queue Capabilities",
    description: "Lists available task-queue tools and boundaries.",
    mimeType: "application/json"
  },
  (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            server: "hermes-task-queue",
            tools: ["queue_create_task", "queue_list_tasks", "queue_update_task_status"],
            purpose: "Record Telegram/Hermes messages into a local task queue dashboard.",
            boundaries: [
              "Task queue is not an automatic code executor.",
              "It does not replace user confirmation gates.",
              "Queue data is local runtime state."
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
  "task_queue_usage",
  "Guide Hermes to use task-queue as a message registration and status-tracking tool.",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Use mcp_task_queue_queue_create_task only after Hermes has understood the user's request.",
            "Use mcp_task_queue_queue_list_tasks to inspect queued messages.",
            "Use mcp_task_queue_queue_update_task_status to mark queue items processing, done, or failed.",
            "Do not treat task-queue as an automatic executor."
          ].join("\n")
        }
      }
    ]
  })
);

server.tool(
  "queue_create_task",
  "Write a Telegram/Hermes message into the local task queue dashboard.",
  {
    text: z.string().min(1),
    source: z.string().default("telegram"),
    chatId: z.string().optional(),
    user: z.string().optional(),
    timestamp: z.string().optional()
  },
  async (input) => {
    const task = await createTask(input);
    return {
      content: [
        {
          type: "text",
          text: `Queued task ${task.id}: ${task.text}`
        }
      ]
    };
  }
);

server.tool(
  "queue_list_tasks",
  "List recent tasks from the local Telegram/Hermes queue.",
  {
    limit: z.number().int().positive().max(50).default(10)
  },
  async ({ limit }) => {
    const tasks = (await listTasks()).slice(0, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasks, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "queue_update_task_status",
  "Update a queued Telegram/Hermes task status.",
  {
    id: z.string().min(1),
    status: z.enum(["queued", "processing", "done", "failed"]),
    note: z.string().optional()
  },
  async ({ id, status, note }) => {
    const task = await updateTaskStatus(id, status, note);
    return {
      content: [
        {
          type: "text",
          text: `Updated task ${task.id} to ${task.status}.`
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
