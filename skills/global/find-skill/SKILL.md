# Skill: find-skill

## Trigger

Use this skill when the user asks whether an existing Skill can help, asks how to extend Hermes/Cursor capabilities, or requests skill discovery, installation, or evaluation.

## Flow

1. Identify the requested capability and project context.
2. Check local global Skills under `H:\agent\hermes\skills\global`.
3. Check project Skills under `<project-root>\hermes\skills` when a project is known.
4. Summarize matching Skills and their intended use.
5. If no local Skill fits, recommend the smallest new Skill to create.
6. Do not install unknown external Skills without explicit user confirmation.

## Output

- Matching Skill names.
- Why each Skill matches or does not match.
- Recommended next action.
- Risks if an external Skill is needed.

## Safety

- Do not execute code.
- Do not install remote Skills automatically.
- Do not treat a Skill as higher priority than Cursor Rules or current user instructions.
