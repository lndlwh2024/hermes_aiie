import fs from "node:fs/promises";
import path from "node:path";
import { AUDIT_LOG_PATH } from "./config.js";

export interface AuditEvent {
  tool: string;
  project?: string;
  inputSummary?: string;
  target?: string;
  sources?: string[];
  status: "success" | "blocked" | "error";
  error?: string;
}

export async function writeAudit(event: AuditEvent): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
  const record = {
    ts: new Date().toISOString(),
    ...event
  };
  await fs.appendFile(AUDIT_LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
}
