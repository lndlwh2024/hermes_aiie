# Hermes Lessons For News Project

## Purpose

Store Hermes integration and troubleshooting lessons relevant to the `news` project and Cursor cooperation.

## Current Lessons

- Hermes was minimized during channel recovery; current first-stage target is to restore context capabilities, not all execution capabilities.
- Gemini slow response root causes included custom `httpx` transport bypassing proxy, Gemini OpenAI-compatible authentication mismatch, auxiliary auto-detection overhead, and `SOUL.md` BOM blocking persona loading.
- The stable target architecture is: Cursor Rules -> Hermes Memory -> Skills + MCP -> Hermes Context Docs.
- Long context docs must be loaded only when a Skill or MCP query indicates they are relevant.

## Loading Rule

Read this file when a task involves Hermes Gateway, Telegram channel behavior, Gemini provider latency, memory/session search, Skills, or Hermes-Cursor context architecture.
