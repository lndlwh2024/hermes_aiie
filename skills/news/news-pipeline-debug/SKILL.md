# Skill: News Pipeline Debug

## Trigger

Use this skill for Mode 1, Mode 2, Mode 3, report generation, R1/R2 fallback, or monitoring pipeline failures in the `news` project.

## Context Sources

- `H:\agent\hermes\contexts\news\project-profile.md`
- `H:\agent\hermes\contexts\news\supabase-lessons.md`
- `H:\agent\hermes\contexts\news\incident-log.md`

## Flow

1. Identify the mode and environment.
2. Separate frontend, Edge Function, database, and deployment causes.
3. Compare staging and production data/config before assuming code regression.
4. Preserve raw failure state; do not hide real errors.
5. Write back verified lessons after root cause is confirmed.
