# News Deployment Lessons

## Purpose

Store deployment-related lessons for the `news` project.

## Current Lessons

- Treat production and staging as separate environments.
- Do not assume Git push automatically deploys every target; Vercel ignored build/deployment settings may alter behavior.
- Database, Edge Functions, and frontend deployment chains must be verified independently.
- Any release-related action needs explicit validation and rollback steps.

## Writeback Rule

Add future deployment incidents here only after the root cause and verification result are known.
