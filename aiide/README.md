# AI IDE Integration

This directory contains platform-level guidance for connecting Hermes AIIE with Cursor, Trae, and other AI IDEs.

It is not Hermes runtime configuration and it is not an MCP server. It is a portable set of role definitions, orchestration rules, and document policies that other projects can reference when adopting Hermes as a context and governance layer.

## Directory Layout

```text
aiide/
  README.md
  orchestration/
    main-agent-pm-workflow.md
    delivery-gates.md
    document-update-policy.md
  agents/
    pd.md
    ui.md
    as.md
    dev.md
    qa.md
    ad.md
    pm.md
```

## Design Boundary

- `aiide/agents/` defines AI IDE role templates. These are consumed by Cursor/Trae-like IDEs, not by Telegram Hermes directly.
- `aiide/orchestration/` defines how the main agent coordinates role agents and user confirmations.
- `skills/` remains for Hermes runtime skills that Hermes can load as reusable procedures.
- Project-specific overrides should live under each project, for example `<project-root>/hermes/profile/project-rules-summary.md`.

## Default Operating Model

The main agent acts as the PM orchestration hub by default:

- The user talks to the main agent only.
- The user does not need to mention `@pm`.
- The main agent calls role agents when the task risk and stage require them.
- The standalone `pm` role is retained as a reference template and for explicit independent process audits, but it is not part of the default role chain.

Default role chain for new independent requirements:

```text
pd -> ui(if UI/UX is involved) -> as -> dev -> qa -> user confirms development -> implementation -> qa test report
```

`ad` is optional and should be called when research, macro, cross-asset, industry, or report-quality judgment is involved.

## Project Adoption

A project should reference this platform workflow instead of copying the full contents:

```text
This project follows H:\agent\hermes\aiide\orchestration\main-agent-pm-workflow.md.
Project-specific differences are documented in <project-root>\hermes\profile\project-rules-summary.md.
```

This prevents project-level forks from drifting away from the platform workflow.
