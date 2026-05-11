# Delivery Gates

## Purpose

Define stage gates for Hermes AIIE integrations with AI IDE coding agents.

## Stages

```text
S0 Requirement Clarification
S1 Solution Review
S2 Document Completion
S3 Development Implementation
S4 Verification And Rollback
S5 Delivery Notes
```

## Gate-A: User Confirms Solution

The main agent must not enter development until the user explicitly confirms the solution.

## Gate-B: Documents Confirmed

The main agent must not enter development until these documents are shown and confirmed when the task scope requires them:

- PRD: target, scope, non-scope.
- SDD: architecture, boundaries, security, rollback.
- TDD: detailed flow, interfaces, data, implementation plan.
- Test cases: happy path, abnormal path, boundary, regression.

Existing documents should be updated instead of replaced by new same-purpose documents.

## Gate-C: Verification And Rollback

Release-related work requires:

- validation steps;
- rollback plan;
- rollback trigger conditions.

## Gate-D: Deployment Boundary

Direct frontend, backend, and database deployment is not allowed by default.

The normal release chain is git-based. Exceptions require explicit user authorization such as:

```text
允许例外部署
```

## Blocked State Behavior

When a gate is not passed, the main agent may only output:

- current stage;
- gate status;
- missing items;
- shortest path to complete the missing items;
- next action allowed in the current stage.

It must not output code, patches, commands, scripts, or deployment steps.

## Main Agent PM Responsibility

The main agent owns gate enforcement by default. The standalone `pm` role is only a reference or an optional independent auditor.
