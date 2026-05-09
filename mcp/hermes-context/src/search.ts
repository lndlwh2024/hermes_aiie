export interface SearchMatch {
  source: string;
  score: number;
  snippet: string;
}

const MAX_SNIPPET_CHARS = 1200;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function makeSnippet(content: string, terms: string[]): string {
  const lower = content.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;

  const start = Math.max(0, firstHit - 250);
  const end = Math.min(content.length, start + MAX_SNIPPET_CHARS);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";

  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

export function scoreContent(source: string, content: string, query: string): SearchMatch | null {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) {
    return null;
  }

  const lowerSource = source.toLowerCase();
  const lowerContent = content.toLowerCase();
  const headingText = content
    .split(/\r?\n/)
    .filter((line) => /^#{1,3}\s/.test(line))
    .join("\n")
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = lowerContent.match(new RegExp(escaped, "g"))?.length ?? 0;
    if (occurrences > 0) score += occurrences;
    if (lowerSource.includes(term)) score += 4;
    if (headingText.includes(term)) score += 3;
  }

  if (score === 0) {
    return null;
  }

  return {
    source,
    score,
    snippet: makeSnippet(content, terms)
  };
}
