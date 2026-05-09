# Skill: Report UI Regression Check

## Trigger

Use this skill when Mode 2 or Mode 3 report UI rendering changes, structured JSON fallback changes, Markdown fallback changes, or report data appears missing.

## Context Sources

- `H:\agent\hermes\contexts\news\project-profile.md`
- `H:\agent\hermes\contexts\news\incident-log.md`

## Flow

1. Determine whether source content is Markdown, JSON, or fallback output.
2. Confirm the UI preserves all report sections before optimizing layout.
3. Check existing reports when possible before triggering new costly generation.
4. Separate rendering bugs from prompt/output schema bugs.
5. Write back any verified regression pattern.
