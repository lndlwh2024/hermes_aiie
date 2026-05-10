"""Create a local audit-trail markdown entry.

This helper is intentionally filesystem-only. Hermes should use the
`mcp_hermes_context_append_lesson` tool when it needs to write a project
record through MCP. This script is a fallback for local/manual recording.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
from pathlib import Path


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", value.strip().lower())
    slug = slug.strip("-")
    return slug[:80] or "audit-entry"


def build_record(args: argparse.Namespace) -> str:
    timestamp = dt.datetime.now(dt.UTC).isoformat()
    return "\n".join(
        [
            "## Audit Trail Entry",
            "",
            f"- Project: {args.project}",
            f"- Time: {timestamp}",
            f"- Action Type: {args.action_type}",
            f"- Target: {args.target}",
            f"- Risk: {args.risk}",
            f"- Summary: {args.summary}",
            f"- Result: {args.result}",
            f"- Evidence: {args.evidence}",
            f"- Follow-up: {args.follow_up}",
            "",
        ]
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Write a local audit-trail entry.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--action-type", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument("--risk", choices=["low", "medium", "high"], default="low")
    parser.add_argument("--evidence", default="none")
    parser.add_argument("--follow-up", default="none")
    parser.add_argument(
        "--output-dir",
        default=str(Path.home() / "AppData" / "Local" / "hermes" / "audit-trail"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    path = output_dir / f"{timestamp}-{slugify(args.project)}-{slugify(args.action_type)}.md"
    path.write_text(build_record(args), encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
