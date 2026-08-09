#!/usr/bin/env python3
"""Assemble a GitHub Release body from CHANGELOG.md + build metadata.

Owning spec: spec/12-cicd-pipeline-workflows/07-release-body-and-changelog.md
Plan 90 Step 97.

Adaptation vs. spec (called out per Working Stance rules):

* Spec is Go-centric ("Go Version" row, .tar.gz/.zip Go binary asset matrix).
  This project ships PyInstaller Windows binaries + POSIX installer, so the
  "Go Version" row is replaced by "Python Version" and the asset matrix is
  derived from the actual files under ``dist/`` at generation time. Every
  other invariant from the spec is kept verbatim: awk-equivalent changelog
  extraction anchored on ``## v<VERSION>``, graceful fallback to
  ``Release <VERSION>`` when the entry is missing, pre-release banner on any
  ``-`` suffix, checksums block, install one-liners, non-empty validation.

* No em dashes anywhere per the project's user memory. Hyphens or the word
  "to" instead. Applies to prose emitted by this file (headings still use the
  literal characters found in CHANGELOG.md since we do not rewrite entries).

Deliberate error-management posture (spec/03-error-manage/):

* Every failure exits with a stable non-zero code AND writes a
  ``::error::`` GitHub Actions annotation to stderr, so CI logs point at the
  exact reason (missing changelog, empty body, unreadable checksums).
* CHANGELOG-missing / entry-missing degrade to the fallback string per spec
  "Graceful Fallback" section; that is not an error, it is a designed path.
* Checksums-missing IS an error: the release page contract requires it.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys
from datetime import datetime, timezone


REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
CHANGELOG_DEFAULT = REPO_ROOT / "CHANGELOG.md"

# Matches the CHANGELOG heading convention used by this repo:
#   ## v4.98.0 - 2026-07-21
# and the spec's variant with an em/en dash, both forms accepted on read
# (we do not emit em dashes ourselves).
HEADING_RE = re.compile(r"^##\s+(v[^\s]+)\b")


def _annotate_error(message: str) -> None:
    """Write a GitHub Actions error annotation to stderr."""
    sys.stderr.write(f"::error::{message}\n")


def extract_changelog_entry(changelog: pathlib.Path, version: str) -> str:
    """Return the CHANGELOG section for ``version`` or a fallback line.

    Mirrors the awk pattern in spec §"Extraction Pattern":
      * scan for ``## ``,
      * start capturing at the first heading whose token matches ``version``,
      * stop at the next ``## `` heading.
    Missing file or missing entry both fall back to ``Release <version>`` per
    spec §"Graceful Fallback".
    """
    if not changelog.is_file():
        return f"Release {version}"

    captured: list[str] = []
    in_section = False
    # Version can arrive as "v4.98.0" or "4.98.0"; normalize for matching only.
    needle_variants = {version, version.lstrip("v"), f"v{version.lstrip('v')}"}

    for line in changelog.read_text(encoding="utf-8").splitlines():
        heading = HEADING_RE.match(line)
        if heading:
            if in_section:
                break
            token = heading.group(1)
            if token in needle_variants or token.lstrip("v") in needle_variants:
                in_section = True
        if in_section:
            captured.append(line)

    entry = "\n".join(captured).strip()
    return entry if entry else f"Release {version}"


def read_checksums(path: pathlib.Path | None) -> str:
    """Return the checksums file contents or raise SystemExit with annotation."""
    if path is None:
        _annotate_error(
            "checksums file not provided; pass --checksums or set CHECKSUMS_FILE"
        )
        raise SystemExit(2)
    if not path.is_file():
        _annotate_error(f"checksums file not found: {path}")
        raise SystemExit(2)
    body = path.read_text(encoding="utf-8").strip()
    if not body:
        _annotate_error(f"checksums file is empty: {path}")
        raise SystemExit(2)
    return body


def collect_assets(dist_dir: pathlib.Path | None) -> list[tuple[str, str]]:
    """Return ``(label, filename)`` rows for the Assets table.

    Rather than hard-coding the Go binary matrix from the spec (which does not
    match this project's actual outputs), we enumerate files present in
    ``dist_dir``. When the dir is absent or empty, we return an empty list and
    the Assets section is omitted (spec allows "no image beats a generic one"
    equivalent principle: never lie about assets that were not built).
    """
    if dist_dir is None or not dist_dir.is_dir():
        return []
    rows: list[tuple[str, str]] = []
    for entry in sorted(dist_dir.iterdir()):
        if not entry.is_file():
            continue
        name = entry.name
        # Skip the checksums file itself; it has its own section.
        if name.lower() in {"sha256sums.txt", "checksums.txt"}:
            continue
        label = _label_for(name)
        rows.append((label, name))
    return rows


def _label_for(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".ps1"):
        return "Windows installer"
    if lower.endswith(".sh"):
        return "POSIX installer"
    if "windows" in lower or lower.endswith(".exe") or lower.endswith(".zip"):
        return "Windows binary"
    if "linux" in lower or lower.endswith(".tar.gz"):
        return "Linux binary"
    if "darwin" in lower or "macos" in lower:
        return "macOS binary"
    return "Asset"


def is_prerelease(version: str) -> bool:
    """Any hyphen suffix on the SemVer core is a pre-release per spec §Pre-Release."""
    core = version.lstrip("v")
    # Strip build metadata (`+...`) first per SemVer 2.0.
    core = core.split("+", 1)[0]
    return "-" in core


def assemble(
    version: str,
    repo: str,
    commit_sha: str,
    branch: str,
    changelog_entry: str,
    checksums: str,
    python_version: str,
    assets: list[tuple[str, str]],
) -> str:
    build_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    short_sha = commit_sha[:10] if commit_sha else "unknown"

    parts: list[str] = []

    if is_prerelease(version):
        parts.append(
            "> WARNING: This is a pre-release. "
            "It may contain breaking changes and is not recommended for production use.\n"
        )

    parts.append(changelog_entry.rstrip() + "\n")
    parts.append("\n---\n\n## Release Info\n\n")
    parts.append("| Field | Value |\n|-------|-------|\n")
    parts.append(f"| Version | `{version}` |\n")
    parts.append(f"| Commit | `{short_sha}` |\n")
    parts.append(f"| Branch | `{branch or 'unknown'}` |\n")
    parts.append(f"| Build Date | {build_date} |\n")
    parts.append(f"| Python Version | {python_version or 'unknown'} |\n")

    parts.append("\n## Checksums (SHA256)\n\n```\n")
    parts.append(checksums.rstrip() + "\n")
    parts.append("```\n")

    parts.append("\n## Install\n\n")
    parts.append("### Quick install (Windows PowerShell)\n\n```powershell\n")
    parts.append(
        f"irm https://github.com/{repo}/releases/download/{version}/install.ps1 | iex\n"
    )
    parts.append("```\n\n### Quick install (Linux / macOS)\n\n```bash\n")
    parts.append(
        f"curl -fsSL https://github.com/{repo}/releases/download/{version}/install.sh | bash\n"
    )
    parts.append("```\n\n### Manual download\n\n")
    parts.append(
        "Download the appropriate archive for your platform from the assets below, "
        "extract, and place the binary in your PATH.\n"
    )

    if assets:
        parts.append("\n## Assets\n\n| Platform | File |\n|----------|------|\n")
        for label, filename in assets:
            parts.append(f"| {label} | `{filename}` |\n")

    return "".join(parts)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generate a GitHub Release body from CHANGELOG.md + build metadata.",
    )
    p.add_argument("--version", required=True, help="Release version (e.g. v4.99.0).")
    p.add_argument(
        "--repo",
        default=os.environ.get("GITHUB_REPOSITORY", ""),
        help="owner/name; defaults to $GITHUB_REPOSITORY.",
    )
    p.add_argument(
        "--commit-sha",
        default=os.environ.get("GITHUB_SHA", ""),
        help="Full commit SHA; defaults to $GITHUB_SHA.",
    )
    p.add_argument(
        "--branch",
        default=os.environ.get("GITHUB_REF_NAME", ""),
        help="Branch name; defaults to $GITHUB_REF_NAME.",
    )
    p.add_argument(
        "--python-version",
        default=os.environ.get("PYTHON_VERSION", ""),
        help="Python version string used to build; defaults to $PYTHON_VERSION.",
    )
    p.add_argument(
        "--changelog",
        type=pathlib.Path,
        default=CHANGELOG_DEFAULT,
        help="Path to CHANGELOG.md.",
    )
    p.add_argument(
        "--checksums",
        type=pathlib.Path,
        default=pathlib.Path(os.environ.get("CHECKSUMS_FILE", "dist/SHA256SUMS.txt")),
        help="Path to SHA256 checksums file.",
    )
    p.add_argument(
        "--dist-dir",
        type=pathlib.Path,
        default=pathlib.Path(os.environ.get("DIST_DIR", "dist")),
        help="Directory to enumerate for the Assets table.",
    )
    p.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path(os.environ.get("RELEASE_NOTES_OUT", "release-notes.md")),
        help="Where to write the assembled release body.",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    entry = extract_changelog_entry(args.changelog, args.version)
    checksums = read_checksums(args.checksums)
    assets = collect_assets(args.dist_dir)

    body = assemble(
        version=args.version,
        repo=args.repo,
        commit_sha=args.commit_sha,
        branch=args.branch,
        changelog_entry=entry,
        checksums=checksums,
        python_version=args.python_version,
        assets=assets,
    )

    if not body.strip():
        _annotate_error("assembled release body is empty")
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(body, encoding="utf-8")
    line_count = body.count("\n")
    sys.stdout.write(f"Release body written to {args.output} ({line_count} lines)\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
