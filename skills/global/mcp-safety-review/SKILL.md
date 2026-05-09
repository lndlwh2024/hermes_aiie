# Skill: MCP Safety Review

## Trigger

Use this skill before enabling a new MCP server or exposing new tools to Hermes or Cursor.

## Checklist

- Identify tool origin and trust level.
- Read tool schemas before use.
- Classify capabilities: read, write, command execution, deployment, database, messaging.
- Define allowlist and denylist.
- Define audit logging.
- Define rollback.

## Default Policy

Prefer read-only first. High-risk actions require explicit user confirmation.
