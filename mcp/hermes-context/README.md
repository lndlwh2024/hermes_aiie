# Hermes Context MCP

## Status

Implemented as a restricted local MCP for project context, work logs, current-context snapshots, issue ledgers, and MCP-side Telegram action notifications.

## Tools

- `get_project_profile`
- `list_context_sources`
- `route_context_need`
- `search_context`
- `append_lesson`
- `append_audit_entry`
- `list_audit_entries`
- `summarize_daily_audit`
- `write_current_context`
- `get_current_context`
- `list_current_context_versions`
- `archive_current_context`
- `upsert_issue`
- `get_issue`
- `list_issues`
- `close_issue`

## Notifications

Successful write tools call Telegram Bot API directly from the MCP process:

- `append_lesson`
- `append_audit_entry`
- `write_current_context`
- `archive_current_context`
- `upsert_issue`
- `close_issue`

Notification text uses Chinese field titles. Values for trigger type and Skill/MCP include both the stable English identifier and a Chinese label.

The notification client honors `HTTPS_PROXY` / `HTTP_PROXY` from the process environment or Hermes runtime `.env`. This is required in proxy-based environments because Node's native `fetch` does not automatically use proxy environment variables.

## Safety

- Write operations require audit and sensitive information scanning.
- Project context must be isolated by project key.
- Work logs only write under `AppData\Local\hermes\audit-trail`.
- Current context only writes under the registered project's `hermes\state` directory.
- Issue ledgers only write under the registered project's `hermes\issues` directory.
- No Python, terminal, arbitrary file, or code execution permission is required.

## Issue Ledger

`upsert_issue` maintains ongoing project issues as structured Markdown plus an `index.json`:

```text
<project-root>\hermes\issues\
  <issue-id>.md
  index.json
```

Required fields include project, issue ID/title, status, priority, version, occurred time, impact, owner, summary, current conclusion, proposed solution, next validation, related files, evidence, and risk. `close_issue` records the final fix and verification result, then marks the issue closed.
