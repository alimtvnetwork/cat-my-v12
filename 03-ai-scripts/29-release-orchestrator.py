#!/usr/bin/env python3
"""
29-release-orchestrator.py — Automated Release Orchestrator & Branch Lifecycle.
Implements the Release Management Prompt Version 2.1.0 lifecycle specification.

Lifecycle:
  1. Record starting branch (original_branch).
  2. Bump SemVer in version.json, package.json, readme.md, CHANGELOG.md, RELEASE_NOTES.md.
  3. Prettier-format all touched files and validate quality gates.
  4. Commit on current branch: `release: vX.Y.Z <scope>`.
  5. Create release branch: `release/vX.Y.Z`.
  6. Create annotated tag: `vX.Y.Z`.
  7. Push commit, release branch, and tag to remote origin.
  8. Revert working tree back to original_branch (guaranteed via finally block).
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_JSON = ROOT / "version.json"
PACKAGE_JSON = ROOT / "package.json"
README = ROOT / "readme.md"
CHANGELOG = ROOT / "CHANGELOG.md"
RELEASE_NOTES = ROOT / "RELEASE_NOTES.md"


def run_cmd(cmd: list[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=ROOT,
        check=check,
        capture_output=capture,
        text=True,
    )


def get_current_branch() -> str:
    res = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture=True)
    branch = res.stdout.strip()
    if not branch:
        sys.exit("Error: Could not determine current git branch.")
    return branch


def get_repo_remote_url() -> str:
    try:
        res = run_cmd(["git", "config", "--get", "remote.origin.url"], capture=True)
        url = res.stdout.strip()
        if "github.com:" in url:
            return url.split("github.com:")[1].replace(".git", "")
        if "github.com/" in url:
            return url.split("github.com/")[1].replace(".git", "")
        return url
    except Exception:
        return "alimtvnetwork/cat-my-v12"


def read_current_version() -> tuple[int, int, int]:
    if VERSION_JSON.exists():
        try:
            data = json.loads(VERSION_JSON.read_text(encoding="utf-8"))
            ver_str = data.get("version", "")
            parts = [int(p) for p in ver_str.split(".")]
            if len(parts) == 3:
                return parts[0], parts[1], parts[2]
        except Exception:
            pass

    if PACKAGE_JSON.exists():
        data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
        ver_str = data.get("version", "")
        parts = [int(p) for p in ver_str.split(".")]
        if len(parts) == 3:
            return parts[0], parts[1], parts[2]

    sys.exit("Error: Unable to determine current version from version.json or package.json.")


def compute_next_version(current: tuple[int, int, int], tier: str) -> str:
    major, minor, patch = current
    if tier == "major":
        return f"{major + 1}.0.0"
    if tier == "minor":
        return f"{major}.{minor + 1}.0"
    if tier == "patch":
        return f"{major}.{minor}.{patch + 1}"
    sys.exit(f"Error: Unknown bump tier '{tier}'. Must be major, minor, or patch.")


def update_version_json(new_ver: str, today: str, dry_run: bool) -> None:
    data = {
        "version": new_ver,
        "releaseDate": today,
        "changelog": {
            "file_path": "CHANGELOG.md",
            "format": "keep-a-changelog",
        },
    }
    content = json.dumps(data, indent=2) + "\n"
    if not dry_run:
        VERSION_JSON.write_text(content, encoding="utf-8")
    print(f"  [OK] version.json -> {new_ver}")


def update_package_json(new_ver: str, dry_run: bool) -> None:
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    data["version"] = new_ver
    content = json.dumps(data, indent=2) + "\n"
    if not dry_run:
        PACKAGE_JSON.write_text(content, encoding="utf-8")
    print(f"  [OK] package.json -> {new_ver}")


def update_readme(new_ver: str, scope: str, dry_run: bool) -> None:
    content = README.read_text(encoding="utf-8")

    # Update version badge
    content = re.sub(
        r'https://img\.shields\.io/badge/version-v[0-9]+\.[0-9]+\.[0-9]+-3B82F6',
        f'https://img.shields.io/badge/version-v{new_ver}-3B82F6',
        content,
    )

    # Update STAMP marker
    content = re.sub(
        r'<!-- STAMP:VERSION -->v[0-9]+\.[0-9]+\.[0-9]+<!-- /STAMP:VERSION -->',
        f'<!-- STAMP:VERSION -->v{new_ver}<!-- /STAMP:VERSION -->',
        content,
    )

    # Prepend to What's New section
    whats_new_marker = "## 🔄 What's New\n\nSee [`CHANGELOG.md`](CHANGELOG.md) for complete version release notes and update details.\n\n"
    if whats_new_marker in content:
        new_entry = f"- **v{new_ver}**: {scope}\n"
        content = content.replace(whats_new_marker, whats_new_marker + new_entry, 1)

    if not dry_run:
        README.write_text(content, encoding="utf-8")
    print(f"  [OK] readme.md -> v{new_ver}")


def update_changelog(new_ver: str, today: str, scope: str, repo: str, notes_path: str | None, dry_run: bool) -> None:
    bullets = f"- {scope}\n"
    if notes_path and Path(notes_path).exists():
        bullets = Path(notes_path).read_text(encoding="utf-8").strip() + "\n"

    block = (
        f"## v{new_ver} - {today}\n\n"
        f"### Install Control Automation v{new_ver}\n\n"
        f"To pin your repository to this exact version, run the following one-liner:\n\n"
        f"Unix/Bash:\n"
        f'`curl -sL https://raw.githubusercontent.com/{repo}/v{new_ver}/install.sh | bash -s -- ".ai-memory/prompts" "v{new_ver}"`\n\n'
        f"PowerShell:\n"
        f'`Invoke-WebRequest -Uri https://raw.githubusercontent.com/{repo}/v{new_ver}/install.ps1 -OutFile install.ps1; .\\install.ps1 -TargetDir ".ai-memory/prompts" -Version "v{new_ver}"`\n\n'
        f"### Changed\n\n"
        f"{bullets}\n"
    )

    content = CHANGELOG.read_text(encoding="utf-8")
    new_content = block + content
    if not dry_run:
        CHANGELOG.write_text(new_content, encoding="utf-8")
    print(f"  [OK] CHANGELOG.md -> v{new_ver}")


def update_release_notes(new_ver: str, today: str, scope: str, dry_run: bool) -> None:
    block = (
        f"## v{new_ver} - {today} - {scope}\n\n"
        f"Release v{new_ver}: {scope}.\n\n"
    )
    content = RELEASE_NOTES.read_text(encoding="utf-8")
    new_content = block + content
    if not dry_run:
        RELEASE_NOTES.write_text(new_content, encoding="utf-8")
    print(f"  [OK] RELEASE_NOTES.md -> v{new_ver}")


def format_files(files: list[Path]) -> None:
    file_strs = [str(f.relative_to(ROOT)) for f in files if f.exists()]
    cmd = ["bun", "x", "prettier", "--write"] + file_strs
    print(f"[RUN] Prettier formatting: {' '.join(file_strs)}")
    run_cmd(cmd)


def main() -> None:
    parser = argparse.ArgumentParser(description="Automated Release Orchestrator & Branch Lifecycle.")
    parser.add_argument("--tier", choices=["major", "minor", "patch"], default="minor", help="SemVer bump tier")
    parser.add_argument("--scope", default="Automated release orchestration and version bump", help="Release scope")
    parser.add_argument("--notes", help="Path to markdown notes for changelog")
    parser.add_argument("--date", default=datetime.date.today().isoformat(), help="Release date in YYYY-MM-DD")
    parser.add_argument("--dry-run", action="store_true", help="Preview bump without modifying git or files")
    parser.add_argument("--skip-push", action="store_true", help="Do not push release branch and tag to remote")
    args = parser.parse_args()

    original_branch = get_current_branch()
    curr = read_current_version()
    new_ver = compute_next_version(curr, args.tier)
    tag_name = f"v{new_ver}"
    release_branch = f"release/v{new_ver}"
    repo = get_repo_remote_url()

    print("=" * 72)
    print("       AUTOMATED RELEASE ORCHESTRATOR & BRANCH LIFECYCLE")
    print("=" * 72)
    print(f"  Starting Branch:   {original_branch}")
    print(f"  Current Version:   {curr[0]}.{curr[1]}.{curr[2]}")
    print(f"  Target Version:    {new_ver} (tier: {args.tier})")
    print(f"  Release Branch:    {release_branch}")
    print(f"  Release Tag:       {tag_name}")
    print(f"  Scope:             {args.scope}")
    print(f"  Date:              {args.date}")
    print("=" * 72)

    if args.dry_run:
        print("\n[DRY-RUN] Simulating version updates:")
        update_version_json(new_ver, args.date, dry_run=True)
        update_package_json(new_ver, dry_run=True)
        update_readme(new_ver, args.scope, dry_run=True)
        update_changelog(new_ver, args.date, args.scope, repo, args.notes, dry_run=True)
        update_release_notes(new_ver, args.date, args.scope, dry_run=True)
        print("\n[DRY-RUN] Dry run complete. Working tree untouched.")
        return

    # Check for uncommitted changes before starting
    status_res = run_cmd(["git", "status", "--porcelain"], capture=True)
    if status_res.stdout.strip():
        sys.exit(
            "Error: Working tree has uncommitted changes. Please commit or stash before running release orchestrator."
        )

    try:
        # Step 2: In-place file updates
        print("\n[STEP 1/6] Synchronizing Version Pin Sites...")
        update_version_json(new_ver, args.date, dry_run=False)
        update_package_json(new_ver, dry_run=False)
        update_readme(new_ver, args.scope, dry_run=False)
        update_changelog(new_ver, args.date, args.scope, repo, args.notes, dry_run=False)
        update_release_notes(new_ver, args.date, args.scope, dry_run=False)

        touched = [VERSION_JSON, PACKAGE_JSON, README, CHANGELOG, RELEASE_NOTES]

        # Step 3: Format files with Prettier
        print("\n[STEP 2/6] Enforcing Prettier AST Compliance...")
        format_files(touched)

        # Step 4: Quality Gate Validation
        print("\n[STEP 3/6] Running Quality Gates...")
        run_cmd([sys.executable, "linter-scripts/check-root-readme.py"])

        # Step 5: Stage & Commit on current branch
        print(f"\n[STEP 4/6] Creating Release Commit on {original_branch}...")
        run_cmd(["git", "add"] + [str(f.relative_to(ROOT)) for f in touched])
        commit_msg = f"release: {tag_name} {args.scope}"
        run_cmd(["git", "commit", "-m", commit_msg])

        # Step 6: Create release branch and annotated tag
        print(f"\n[STEP 5/6] Creating Release Branch '{release_branch}' & Tag '{tag_name}'...")
        # Create branch pointing to the current commit without checking it out
        run_cmd(["git", "branch", release_branch])
        # Create annotated git tag
        run_cmd(["git", "tag", "-a", tag_name, "-m", commit_msg])

        # Step 7: Push to remote origin
        if not args.skip_push:
            print("\n[STEP 6/6] Pushing Release Artifacts to Remote Origin...")
            run_cmd(["git", "push", "origin", original_branch])
            run_cmd(["git", "push", "origin", release_branch])
            run_cmd(["git", "push", "origin", tag_name])
        else:
            print("\n[STEP 6/6] Skipping remote push (--skip-push).")

        print("\n" + "=" * 72)
        print(f"  SUCCESSFULLY ORCHESTRATED RELEASE {tag_name}!")
        print(f"  - Version:         {new_ver}")
        print(f"  - Release Branch:  {release_branch}")
        print(f"  - Annotated Tag:   {tag_name}")
        print(f"  - Current Branch:  {original_branch}")
        print("=" * 72)

    finally:
        # Mandatory branch reversion invariant
        active_branch = get_current_branch()
        if active_branch != original_branch:
            print(f"\n[REVERT] Restoring working tree to original branch: {original_branch}")
            run_cmd(["git", "checkout", original_branch])
        else:
            print(f"\n[VERIFIED] Active branch remains original branch: {original_branch}")


if __name__ == "__main__":
    main()
