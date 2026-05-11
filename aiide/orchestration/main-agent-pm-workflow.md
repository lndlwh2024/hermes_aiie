# Main Agent PM Workflow

## Purpose

Define the default AI IDE orchestration model for Hermes AIIE integrations.

The main agent is the single user-facing coordinator. It carries the PM function by default, manages gates, calls specialized role agents, resolves conflicts, and gives the user one consolidated recommendation.

## Default Rule

- The user talks to the main agent only.
- The user does not need to invoke `@pm`.
- The main agent acts as PM orchestration hub.
- The standalone `pm` agent is not called by default.
- The standalone `pm` agent can be called only for explicit independent process audits or when the user asks for it.

## Standard Flow For New Independent Requirements

1. `pd`: clarify product need, scope, non-scope, value, priority, and acceptance criteria.
2. User confirms the product requirement.
3. Update existing PRD. If a PRD already exists, update it instead of creating a same-purpose new document.
4. `ui`: design UI/UX only when the requirement touches screens, interaction, display, or user experience.
5. User confirms UI/UX design.
6. Update existing UI/UX documentation. Skip this role for old requirements that do not touch UI/UX.
7. `as`: design architecture, security, boundaries, performance constraints, validation, and rollback.
8. User confirms architecture.
9. Update existing SDD or architecture document.
10. `dev`: produce detailed technical design, interfaces, data flow, implementation plan, and risk controls.
11. User confirms detailed design.
12. Update existing TDD or detailed design document.
13. `qa`: write test cases, acceptance checks, abnormal flows, regression scope, and release criteria.
14. User confirms test plan.
15. Update existing test case document.
16. The main agent enters implementation only after the user explicitly says: `确认方案 + 确认文档 + 确认开发`.
17. After release or deployment, `qa` executes or guides testing and produces a test report.

## Optional Role

`ad` is not part of the mandatory default chain.

Call `ad` when the task involves:

- macro or cross-asset reasoning;
- investment research;
- industry analysis;
- report quality;
- falsifiability and evidence-chain auditing.

## Conflict Handling

- Role agents provide professional opinions, not automatic final decisions.
- The main agent must identify conflicts and produce a consolidated recommendation.
- If a role blocks the process, the main agent must explain the missing item and shortest path to unblock.
- The user remains the final confirmer.

## Stage Gate

The main agent must not enter coding until all required documents are confirmed and the user gives the exact release phrase:

```text
确认方案 + 确认文档 + 确认开发
```

For publishing or deployment, validation steps and rollback plan must be defined first.

## New Window Continuity

This workflow is not automatically inherited by every new AI IDE window unless the new window reads this document or a project-specific context file that references it.

Project handoff files should instruct new windows to read:

```text
H:\agent\hermes\aiide\orchestration\main-agent-pm-workflow.md
<project-root>\hermes\profile\project-rules-summary.md
<project-root>\hermes\state\current-context.md
```
