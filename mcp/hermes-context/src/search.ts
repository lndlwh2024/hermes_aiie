export interface SearchMatch {
  source: string;
  score: number;
  matchedTerms: string[];
  ignoredTerms: string[];
  snippet: string;
}

const MAX_SNIPPET_CHARS = 1200;
const MIN_RELEVANCE_SCORE = 2;
const MIN_MATCHED_TERMS_FOR_MULTI_TERM_QUERY = 2;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "context",
  "current",
  "doc",
  "docs",
  "file",
  "find",
  "for",
  "from",
  "history",
  "info",
  "issue",
  "no",
  "project",
  "search",
  "such",
  "test",
  "the",
  "this",
  "with",
  "上下文",
  "历史",
  "项目",
  "测试",
  "文档",
  "检索",
  "搜索"
]);

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

function isStopWord(term: string): boolean {
  return STOP_WORDS.has(term);
}

function countOccurrences(text: string, term: string): number {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(escaped, "g"))?.length ?? 0;
}

export function scoreContent(source: string, content: string, query: string): SearchMatch | null {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) {
    return null;
  }

  const significantTerms = terms.filter((term) => !isStopWord(term));
  const ignoredTerms = terms.filter((term) => isStopWord(term));
  if (significantTerms.length === 0) {
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
  const matchedTerms: string[] = [];
  for (const term of significantTerms) {
    const occurrences = countOccurrences(lowerContent, term);
    if (occurrences > 0) score += occurrences;
    if (lowerSource.includes(term)) score += 4;
    if (headingText.includes(term)) score += 3;
    if (occurrences > 0 || lowerSource.includes(term) || headingText.includes(term)) {
      matchedTerms.push(term);
    }
  }

  const hasEnoughTermCoverage =
    significantTerms.length < 3 || matchedTerms.length >= MIN_MATCHED_TERMS_FOR_MULTI_TERM_QUERY;
  if (matchedTerms.length === 0 || score < MIN_RELEVANCE_SCORE || !hasEnoughTermCoverage) {
    return null;
  }

  return {
    source,
    score,
    matchedTerms,
    ignoredTerms,
    snippet: makeSnippet(content, matchedTerms)
  };
}
