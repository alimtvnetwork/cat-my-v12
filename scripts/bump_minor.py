#!/usr/bin/env python3
"""
Bump the minor version and auto-generate changelog.md + release_notes.md entries.

Intended flow:
    python scripts/audit_consolidate.py
    python scripts/bump_minor.py --title "Short headline" [--notes path.md] [--dry-run]

Reads current version from README.md ("**Version:** X.Y.Z"), bumps Y (resets Z to 0),
prepends new sections to changelog.md and release_notes.md, updates README.md.

Source of the "Added" bullets, in order of preference:
  1. --notes PATH (markdown file, contents pasted verbatim)
  2. spec/25-app-audit/latest/99-consolidated.md "Summary" section
  3. Fallback single bullet with title only.
"""
from __future__ import annotations
import argparse, re, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
CHANGELOG = ROOT / "changelog.md"
RELNOTES = ROOT / "release_notes.md"
CONSOLIDATED = ROOT / "spec/25-app-audit/latest/99-consolidated.md"

VERSION_RE = re.compile(r"\*\*Version:\*\*\s*([0-9]+)\.([0-9]+)\.([0-9]+)")


def read_current() -> tuple[int, int, int]:
    m = VERSION_RE.search(README.read_text())
    if not m:
        sys.exit("bump_minor: cannot find '**Version:** X.Y.Z' in README.md")
    return int(m[1]), int(m[2]), int(m[3])


def extract_summary() -> str | None:
    if not CONSOLIDATED.exists():
        return None
    text = CONSOLIDATED.read_text()
    m = re.search(r"##+\s*Summary\s*\n(.+?)(?:\n##\s|\Z)", text, re.S | re.I)
    if not m:
        return None
    body = m.group(1).strip()
    return body or None


def build_bullets(notes_path: str | None, title: str) -> str:
    if notes_path:
        return pathlib.Path(notes_path).read_text().strip()
    summary = extract_summary()
    if summary:
        return summary
    return f"- {title}"


def prepend(path: pathlib.Path, header_pattern: str, block: str) -> None:
    text = path.read_text()
    idx = text.find(header_pattern)
    if idx < 0:
        sys.exit(f"bump_minor: anchor {header_pattern!r} not found in {path.name}")
    # insert after first blank line following the top header
    insert_at = text.find("\n## ", idx)
    if insert_at < 0:
        path.write_text(text.rstrip() + "\n\n" + block + "\n")
        return
    path.write_text(text[:insert_at] + "\n\n" + block.rstrip() + "\n" + text[insert_at:])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True, help="One-line headline for the release")
    ap.add_argument("--notes", help="Path to a markdown file whose contents become the bullets")
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    maj, minor, patch = read_current()
    new_ver = f"{maj}.{minor + 1}.0"
    bullets = build_bullets(args.notes, args.title)

    changelog_block = (
        f"## [{new_ver}] - {args.date}\n\n"
        f"### Added\n{bullets}\n"
    )
    relnotes_block = (
        f"## v{new_ver} - {args.date} - {args.title}\n\n"
        f"{bullets}\n"
    )

    print(f"bump_minor: {maj}.{minor}.{patch} -> {new_ver}")
    print(f"  changelog: +{len(changelog_block.splitlines())} lines")
    print(f"  release_notes: +{len(relnotes_block.splitlines())} lines")

    if args.dry_run:
        print("--- CHANGELOG block ---")
        print(changelog_block)
        print("--- RELEASE_NOTES block ---")
        print(relnotes_block)
        return 0

    prepend(CHANGELOG, "# Changelog", changelog_block)
    prepend(RELNOTES, "# Release Notes", relnotes_block)

    new_readme = VERSION_RE.sub(
        f"**Version:** {new_ver}", README.read_text(), count=1
    )
    README.write_text(new_readme)

    print(f"bump_minor: wrote {new_ver} to README.md, changelog.md, release_notes.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
