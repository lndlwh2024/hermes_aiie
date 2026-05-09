const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "OpenAI-style key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "Supabase service role", pattern: /\bservice_role\b/i },
  { name: "SUPABASE_SERVICE_ROLE", pattern: /\bSUPABASE_SERVICE_ROLE\b/i },
  { name: "TELEGRAM_BOT_TOKEN", pattern: /\bTELEGRAM_BOT_TOKEN\b/i },
  { name: "GOOGLE_API_KEY", pattern: /\bGOOGLE_API_KEY\b/i },
  { name: "GEMINI_API_KEY", pattern: /\bGEMINI_API_KEY\b/i },
  { name: "OPENROUTER_API_KEY", pattern: /\bOPENROUTER_API_KEY\b/i },
  { name: "Private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/ }
];

export function assertSafeContent(content: string): void {
  const hit = SECRET_PATTERNS.find(({ pattern }) => pattern.test(content));
  if (hit) {
    throw new Error(`SENSITIVE_CONTENT_BLOCKED: matched ${hit.name}`);
  }
}

export function summarizeInput(input: unknown): string {
  const raw = JSON.stringify(input);
  if (!raw) {
    return "";
  }
  return raw.length > 500 ? `${raw.slice(0, 500)}...` : raw;
}
