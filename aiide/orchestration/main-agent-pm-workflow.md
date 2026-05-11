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
4. Main agent creates a compressed `Stage Review Packet` for PRD review.
5. Full review gate: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the PRD packet. Add `ad` only when research or report-quality judgment is involved.
6. Main agent consolidates all review findings, conflicts, blockers, and required document changes.
7. User confirms PRD.
8. `ui`: design UI/UX only when the requirement touches screens, interaction, display, or user experience.
9. User confirms UI/UX design.
10. Update existing UI/UX documentation. Skip this role for old requirements that do not touch UI/UX.
11. Main agent creates a compressed `Stage Review Packet` for UI/UX review.
12. Full review gate: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the UI/UX packet. Add `ad` only when relevant.
13. Main agent consolidates the review and asks the user to confirm.
14. `as`: design architecture, security, boundaries, performance constraints, validation, and rollback.
15. User confirms architecture.
16. Update existing SDD or architecture document.
17. Main agent creates a compressed `Stage Review Packet` for architecture review.
18. Full review gate: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the architecture packet. Add `ad` only when relevant.
19. Main agent consolidates the review and asks the user to confirm.
20. `dev`: produce detailed technical design, interfaces, data flow, implementation plan, and risk controls.
21. User confirms detailed design.
22. Update existing TDD or detailed design document.
23. Main agent creates a compressed `Stage Review Packet` for detailed design review.
24. Full review gate: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the TDD packet. Add `ad` only when relevant.
25. Main agent consolidates the review and asks the user to confirm.
26. `qa`: write test cases, acceptance checks, abnormal flows, regression scope, and release criteria.
27. User confirms test plan.
28. Update existing test case document.
29. Main agent creates a compressed `Stage Review Packet` for test plan review.
30. Full review gate: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the test plan packet. Add `ad` only when relevant.
31. Main agent consolidates the review and asks the user to confirm.
32. The main agent enters implementation only after the user explicitly says: `确认方案 + 确认文档 + 确认开发`.
33. After release or deployment, `qa` executes or guides testing and produces a test report.
34. Main agent creates a final acceptance `Stage Review Packet`.
35. Full acceptance review: ask `pd`, `ui`, `as`, `dev`, and `qa` to review the test report and release evidence. Add `ad` only when relevant.

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

## Full Review Gate

The workflow imitates a human project review meeting. Each stage has one primary owner, but every completed stage artifact must pass a full review gate before the user confirms the next stage.

Default reviewers:

```text
pd + ui + as + dev + qa
```

Optional reviewer:

```text
ad
```

Use `ad` only when the artifact contains macro, investment research, industry analysis, report quality, or evidence-chain judgment.

The full review gate is designed to reduce context waste, not increase it. The main agent must not send the entire conversation history to every role. Instead, it must send one compressed `Stage Review Packet`.

## Stage Review Packet

Each packet should contain only the current stage artifact and the minimum shared context needed for review:

- project name and environment;
- current stage and artifact type;
- user-confirmed goals and non-goals;
- links or paths to updated documents;
- key decisions and assumptions;
- open risks and known constraints;
- explicit review questions for each role;
- expected output format and severity labels;
- token budget reminder: review only this packet, do not re-explore unrelated history.

The main agent then consolidates role feedback into:

- blockers;
- must-fix items;
- optional improvements;
- cross-role conflicts;
- document changes required before confirmation;
- recommendation: pass / conditional pass / fail.

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
