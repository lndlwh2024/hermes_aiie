import type { CreateTaskInput } from "./queue.js";

interface UnknownPayload {
  [key: string]: unknown;
}

function readString(payload: UnknownPayload, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

export function normalizeHermesPayload(payload: unknown): CreateTaskInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const body = payload as UnknownPayload;
  const text = readString(body, ["text", "message", "prompt", "content"]);

  if (!text) {
    throw new Error("Missing text/message/prompt/content.");
  }

  return {
    source: readString(body, ["source", "platform"]) || "telegram",
    chatId: readString(body, ["chatId", "chat_id", "conversation", "session_key"]),
    user: readString(body, ["user", "username", "from", "sender"]),
    text,
    timestamp: readString(body, ["timestamp", "time"])
  };
}
