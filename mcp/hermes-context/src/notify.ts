import fs from "node:fs/promises";
import path from "node:path";
import { ProxyAgent } from "undici";
import { HERMES_RUNTIME_ROOT } from "./config.js";

export type NotificationInitiator = "cursor" | "hermes" | "other";
export type NotificationRisk = "low" | "medium" | "high";

export interface ActionNotificationInput {
  project?: string;
  triggerType: string;
  triggerLabel: string;
  initiator: NotificationInitiator;
  toolName: string;
  toolLabel: string;
  result: "success" | "blocked" | "error";
  path?: string;
  risk: NotificationRisk;
  timestamp?: string;
}

export interface ActionNotificationResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

let cachedEnv: Record<string, string> | undefined;

function parseEnvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }
  const index = trimmed.indexOf("=");
  if (index <= 0) {
    return undefined;
  }
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

async function loadRuntimeEnv(): Promise<Record<string, string>> {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: Record<string, string> = {};
  try {
    const raw = await fs.readFile(path.join(HERMES_RUNTIME_ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed) {
        env[parsed[0]] = parsed[1];
      }
    }
  } catch {
    // Missing .env is allowed; notification can still use process.env.
  }

  cachedEnv = env;
  return env;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0);
}

async function getNotificationConfig(): Promise<{ token?: string; chatId?: string; disabled: boolean; proxyUrl?: string }> {
  const fileEnv = await loadRuntimeEnv();
  const disabled = firstDefined(
    process.env.HERMES_ACTION_NOTIFY_DISABLED,
    fileEnv.HERMES_ACTION_NOTIFY_DISABLED
  ) === "1";

  const token = firstDefined(
    process.env.HERMES_ACTION_NOTIFY_TELEGRAM_TOKEN,
    process.env.TELEGRAM_BOT_TOKEN,
    fileEnv.HERMES_ACTION_NOTIFY_TELEGRAM_TOKEN,
    fileEnv.TELEGRAM_BOT_TOKEN
  );

  const chatId = firstDefined(
    process.env.HERMES_ACTION_NOTIFY_TELEGRAM_CHAT_ID,
    process.env.TELEGRAM_AUDIT_NOTIFY_CHAT_ID,
    process.env.TELEGRAM_ALLOWED_USERS?.split(",")[0]?.trim(),
    fileEnv.HERMES_ACTION_NOTIFY_TELEGRAM_CHAT_ID,
    fileEnv.TELEGRAM_AUDIT_NOTIFY_CHAT_ID,
    fileEnv.TELEGRAM_ALLOWED_USERS?.split(",")[0]?.trim()
  );

  const proxyUrl = firstDefined(
    process.env.HTTPS_PROXY,
    process.env.HTTP_PROXY,
    process.env.https_proxy,
    process.env.http_proxy,
    fileEnv.HTTPS_PROXY,
    fileEnv.HTTP_PROXY,
    fileEnv.https_proxy,
    fileEnv.http_proxy
  );

  return { token, chatId, disabled, proxyUrl };
}

function formatNotification(input: ActionNotificationInput): string {
  return [
    "动作已完成",
    "",
    `项目：${input.project || "global"}`,
    `触发类型：${input.triggerType}（${input.triggerLabel}）`,
    `发起者：${input.initiator}`,
    `Skill/MCP：${input.toolName}（${input.toolLabel}）`,
    `结果：${input.result}`,
    `路径：${input.path || "none"}`,
    `风险：${input.risk}`,
    `时间戳：${input.timestamp || new Date().toISOString()}`
  ].join("\n");
}

export async function sendActionNotification(input: ActionNotificationInput): Promise<ActionNotificationResult> {
  const config = await getNotificationConfig();
  if (config.disabled) {
    return { ok: false, skipped: true, error: "notification disabled" };
  }
  if (!config.token || !config.chatId) {
    return { ok: false, skipped: true, error: "missing Telegram notification token or chat id" };
  }

  try {
    const dispatcher = config.proxyUrl ? new ProxyAgent(config.proxyUrl) : undefined;
    const requestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      dispatcher,
      body: JSON.stringify({
        chat_id: config.chatId,
        text: formatNotification(input),
        disable_web_page_preview: true
      })
    } as RequestInit & { dispatcher?: ProxyAgent };

    const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, requestInit);

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Telegram API ${response.status}: ${body.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
