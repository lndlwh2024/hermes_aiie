# Document Update Policy

## Purpose

Define how AI IDE agents update documents during Hermes AIIE guided delivery.

## Core Rule

If a same-purpose document already exists, update that document instead of creating a new one.

Do not create a new PRD, SDD, TDD, test case document, or handoff document for every iteration.

## Role To Document Mapping

| Role | Primary Document |
| --- | --- |
| `pd` | PRD |
| `ui` | UI/UX design document |
| `as` | SDD or architecture document |
| `dev` | TDD or implementation design document |
| `qa` | Test cases and test report |
| `ad` | Research report, only when invoked |
| main agent as PM | plan, handoff, current-context summary |

## When New Documents Are Allowed

Independent versioned documents are allowed for:

- test reports;
- release reports;
- incident reviews;
- migration reports;
- handoff documents when the previous handoff is tied to an old context window.

## Change Log

Long-lived documents should include a change log with:

- time;
- role;
- version or iteration;
- summary of change.

## Project Context

Project-level persistent context belongs in:

```text
<project-root>\hermes\
```

Recommended project files:

```text
hermes/profile/project-profile.md
hermes/profile/project-rules-summary.md
hermes/incidents/*.md
hermes/lessons/*.md
hermes/state/current-context.md
```

`current-context.md` is overwritten over time and should only contain a compact snapshot and references to permanent documents.

Permanent rules belong in profile or lessons files.
