import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type TaskStatus = "queued" | "processing" | "done" | "failed";

export interface TaskRecord {
  id: string;
  source: string;
  chatId?: string;
  user?: string;
  text: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  timestamp?: string;
  note?: string;
}

export interface CreateTaskInput {
  source?: string;
  chatId?: string;
  user?: string;
  text: string;
  timestamp?: string;
}

const DATA_DIR = process.env.HERMES_QUEUE_DATA_DIR || path.resolve("data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.jsonl");

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.appendFile(TASKS_FILE, "", "utf8");
}

async function readEvents(): Promise<TaskRecord[]> {
  await ensureDataFile();
  const content = await fs.readFile(TASKS_FILE, "utf8");

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TaskRecord);
}

async function appendEvent(task: TaskRecord): Promise<void> {
  await ensureDataFile();
  await fs.appendFile(TASKS_FILE, `${JSON.stringify(task)}\n`, "utf8");
}

export async function listTasks(): Promise<TaskRecord[]> {
  const events = await readEvents();
  const latest = new Map<string, TaskRecord>();

  for (const event of events) {
    latest.set(event.id, event);
  }

  return [...latest.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
  const now = new Date().toISOString();
  const text = input.text.trim();

  if (!text) {
    throw new Error("Task text is required.");
  }

  const task: TaskRecord = {
    id: randomUUID(),
    source: input.source || "telegram",
    chatId: input.chatId,
    user: input.user,
    text,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    timestamp: input.timestamp || now
  };

  await appendEvent(task);
  return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus, note?: string): Promise<TaskRecord> {
  const current = (await listTasks()).find((task) => task.id === id);

  if (!current) {
    throw new Error(`Task not found: ${id}`);
  }

  const next: TaskRecord = {
    ...current,
    status,
    note,
    updatedAt: new Date().toISOString()
  };

  await appendEvent(next);
  return next;
}

export function getTasksFilePath(): string {
  return TASKS_FILE;
}
