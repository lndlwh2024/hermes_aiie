---
name: audit-trail
description: Record verified work actions and prepare daily summaries for Hermes-operated software work. Use when the user asks to audit work, record each completed action, summarize today's work, or maintain a work log.
---

# Skill: Audit Trail

## Purpose

Maintain a concise, reviewable work trail for Hermes-assisted software work without mixing project-specific history into the Hermes platform layer.

## When To Use

Use this skill when the user asks Hermes to:

- Record every completed work action.
- Produce a daily work summary.
- Audit what changed during a session.
- Preserve a short action log for later Cursor review.

Do not use this skill for casual conversation or unverified speculation.

## Required Inputs

Each recorded action should include:

- `project`: project key, for example `news`.
- `action_type`: one of `analysis`, `doc_update`, `code_change`, `test`, `config_change`, `verification`, `rollback`, or `other`.
- `summary`: one concise sentence describing the completed action.
- `target`: file, service, document, or subsystem affected.
- `result`: outcome, including success/failure and important evidence.
- `risk`: `low`, `medium`, or `high`.

## Runtime Flow

1. Ask for missing required fields if the user request is ambiguous.
2. Record only completed, observable work.
3. Use `mcp_hermes_context_append_audit_entry` for all work-log records:
   - `scope`: `project` for project work, `global` for Hermes platform work.
   - `project`: required when `scope=project`, for example `news`.
   - `actionType`: one of the allowed action types.
   - `target`: file, service, document, or subsystem affected.
   - `summary`: one concise sentence.
   - `result`: observable outcome.
   - `risk`: `low`, `medium`, or `high`.
4. Use `mcp_hermes_context_list_audit_entries` to read entries for one date.
5. Use `mcp_hermes_context_summarize_daily_audit` for a daily summary.
6. After `append_audit_entry` succeeds, verify the returned `notification` field.
7. If `append_audit_entry` succeeds but `notification.ok=false`, report both states clearly: log persisted, Telegram notification failed.
8. Do not use Python, terminal, code execution, arbitrary file tools, `send_message`, or cron to record work logs.

## Telegram Notification Flow

After a successful work-log write, `hermes-context` MCP sends a concise Telegram notification directly through the Telegram Bot API. Do not call `send_message` separately.

Suggested notification:

```text
项目：<project|global>
触发类型：audit-trail（工作日志）
发起者：<cursor|hermes|other>
Skill/MCP：mcp_hermes_context_append_audit_entry（工作日志写入）
结果：success
路径：<writtenTo.markdown>
风险：<risk>
时间戳：<iso timestamp>
```

Keep the notification short. The full audit content remains in the local audit-trail file.

## Action Record Template

```markdown
## Audit Trail Entry

- Project: <project>
- Time: <ISO-8601 timestamp>
- Action Type: <action_type>
- Target: <target>
- Risk: <low|medium|high>
- Summary: <summary>
- Result: <result>
- Evidence: <logs/tests/commit ids if available>
- Follow-up: <none or next action>
```

## Safety Rules

- Do not record secrets, tokens, private keys, cookies, or full personal data.
- Do not invent actions that were not actually performed.
- Do not mark work as verified unless a test, log, command output, or user confirmation supports it.
- Do not auto-commit or deploy as part of this skill.
- Do not request `terminal`, `file`, `code_execution`, or Python permission for this skill.
- Work-log files are stored only by the MCP tool under the Hermes runtime audit directory.
- Do not send secrets, tokens, private keys, cookies, or full personal data to Telegram.
- Telegram notification is a short status message, not the canonical audit record.

## Notes For Operators

This skill is platform-level and should live in the Hermes source repository under:

```text
H:\agent\hermes\skills\software-development\audit-trail
```

It must be installed in the Hermes runtime skill directory before Telegram Hermes can use it:

```text
C:\Users\<user>\AppData\Local\hermes\skills\software-development\audit-trail
```

The corresponding MCP tools are provided by `hermes-context` and write only under:

```text
C:\Users\<user>\AppData\Local\hermes\audit-trail
```
