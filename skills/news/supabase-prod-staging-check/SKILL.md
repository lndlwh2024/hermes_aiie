# Skill: Supabase Production/Staging Check

## Trigger

Use this skill when production and staging behave differently or when Supabase migrations, Edge Functions, triggers, or environment secrets are involved.

## Context Sources

- `H:\agent\hermes\contexts\news\supabase-lessons.md`
- `H:\agent\hermes\contexts\news\deployment-lessons.md`

## Flow

1. Verify environment target first.
2. Check data/config drift before code changes.
3. Check migrations, triggers, `pg_net`, and Edge Function secrets.
4. Avoid destructive SQL.
5. Produce validation SQL separately from mutation SQL.
