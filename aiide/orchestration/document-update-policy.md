# Document Update Policy

## Purpose

Define how AI IDE agents update documents during Hermes AIIE guided delivery.

## Core Rule

If a same-purpose document already exists, update that document instead of creating a new one.

Do not create a new PRD, SDD, TDD, test case document, or handoff document for every iteration.

Every major document update should be followed by a full review gate. The main agent should generate a compressed `Stage Review Packet` that references the updated document instead of pasting full history to every role.

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

## Review Packet To Document Mapping

| Artifact | Reviewers | Output |
| --- | --- | --- |
| PRD | `pd`, `ui`, `as`, `dev`, `qa` | consolidated PRD review and required PRD edits |
| UI/UX | `pd`, `ui`, `as`, `dev`, `qa` | consolidated UI review and required UI/UX edits |
| SDD / architecture | `pd`, `ui`, `as`, `dev`, `qa` | consolidated architecture/security review and required SDD edits |
| TDD / detailed design | `pd`, `ui`, `as`, `dev`, `qa` | consolidated implementation review and required TDD edits |
| Test plan | `pd`, `ui`, `as`, `dev`, `qa` | consolidated test plan review and required test edits |
| Test report | `pd`, `ui`, `as`, `dev`, `qa` | final acceptance review |

Add `ad` only for research, macro, industry, report-quality, or evidence-chain review.

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
