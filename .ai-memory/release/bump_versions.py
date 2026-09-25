#!/usr/bin/env python3
"""
bump_versions.py — Automated version bumper and release orchestrator.
Compliant with .ai-memory/release/release-method.md and spec §9.

Usage:
  python .ai-memory/release/bump_versions.py --type [major|minor|patch] [--title "Headline"] [--notes path.md] [--dry-run]
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

ROOT = Path(__file__).resolve().parents[2]
VERSION_JSON = ROOT / "version.json"
PACKAGE_JSON = ROOT / "package.json"
README = ROOT / "readme.md"
CHANGELOG = ROOT / "CHANGELOG.md"
RELEASE_NOTES = ROOT / "RELEASE_NOTES.md"


def get_repo_remote_url() -> str:
    try:
        res = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
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


def compute_next_version(current: tuple[int, int, int], bump_type: str) -> str:
    major, minor, patch = current
    if bump_type == "major":
        return f"{major + 1}.0.0"
    if bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    if bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    sys.exit(f"Error: Unknown bump type '{bump_type}'. Must be major, minor, or patch.")


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


def update_readme(new_ver: str, title: str, dry_run: bool) -> None:
    content = README.read_text(encoding="utf-8")

    # Update badge
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
        new_entry = f"- **v{new_ver}**: {title}\n"
        content = content.replace(whats_new_marker, whats_new_marker + new_entry, 1)

    if not dry_run:
        README.write_text(content, encoding="utf-8")
    print(f"  [OK] readme.md -> v{new_ver}")


def update_changelog(new_ver: str, today: str, title: str, repo: str, notes_path: str | None, dry_run: bool) -> None:
    bullets = f"- {title}\n"
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


def update_release_notes(new_ver: str, today: str, title: str, dry_run: bool) -> None:
    block = (
        f"## v{new_ver} - {today} - {title}\n\n"
        f"Release v{new_ver}: {title}.\n\n"
    )
    content = RELEASE_NOTES.read_text(encoding="utf-8")
    new_content = block + content
    if not dry_run:
        RELEASE_NOTES.write_text(new_content, encoding="utf-8")
    print(f"  [OK] RELEASE_NOTES.md -> v{new_ver}")


def format_files(files: list[Path]) -> None:
    file_strs = [str(f.relative_to(ROOT)) for f in files if f.exists()]
    cmd = ["bun", "x", "prettier", "--write"] + file_strs
    print(f"[RUN] Formatting with prettier: {' '.join(file_strs)}")
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bump repository version and synchronize pin sites.")
    parser.add_argument("--type", choices=["major", "minor", "patch"], default="minor", help="SemVer bump tier")
    parser.add_argument("--title", default="Automated version bump and release sync", help="Release headline title")
    parser.add_argument("--notes", help="Path to markdown notes for changelog")
    parser.add_argument("--date", default=datetime.date.today().isoformat(), help="Release date in YYYY-MM-DD")
    parser.add_argument("--dry-run", action="store_true", help="Print changes without modifying files")
    parser.add_argument("--no-commit", action="store_true", help="Do not commit changes to git")
    parser.add_argument("--create-release", action="store_true", help="Push commit to remote branch")
    args = parser.parse_args()

    curr = read_current_version()
    new_ver = compute_next_version(curr, args.type)
    repo = get_repo_remote_url()

    print(f"[INFO] Version Bump: {curr[0]}.{curr[1]}.{curr[2]} -> {new_ver} (type: {args.type})")
    print(f"[INFO] Repository: {repo}")
    print(f"[INFO] Date: {args.date}")

    if args.dry_run:
        print("[DRY-RUN] No files will be modified.")

    update_version_json(new_ver, args.date, args.dry_run)
    update_package_json(new_ver, args.dry_run)
    update_readme(new_ver, args.title, args.dry_run)
    update_changelog(new_ver, args.date, args.title, repo, args.notes, args.dry_run)
    update_release_notes(new_ver, args.date, args.title, args.dry_run)

    touched = [VERSION_JSON, PACKAGE_JSON, README, CHANGELOG, RELEASE_NOTES]

    if not args.dry_run:
        format_files(touched)

        # Validate §9 root README
        print("[RUN] Validating root README...")
        subprocess.run([sys.executable, "linter-scripts/check-root-readme.py"], cwd=ROOT, check=True)

        if not args.no_commit:
            print("[RUN] Staging and committing release files...")
            subprocess.run(["git", "add"] + [str(f.relative_to(ROOT)) for f in touched], cwd=ROOT, check=True)
            subprocess.run(["git", "commit", "-m", f"chore(release): bump version to v{new_ver}"], cwd=ROOT, check=True)

            if args.create_release:
                print("[RUN] Pushing release commit to remote origin...")
                subprocess.run(["git", "push", "origin", "main"], cwd=ROOT, check=True)

    print(f"\n[SUCCESS] Version successfully bumped to v{new_ver}!")


if __name__ == "__main__":
    main()
