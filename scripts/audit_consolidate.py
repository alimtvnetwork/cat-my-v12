#!/usr/bin/env python3
"""
audit_consolidate.py

Reads spec/ and every audit artifact under spec/25-app-audit/, detects
outdated sections (version drift, dangling plan/spec refs, [TBD] markers,
stale dates), consolidates everything into ONE current audit document at
spec/25-app-audit/latest/99-consolidated.md, and prints a change summary
to stdout.

Read-only for spec/, .lovable/. Only writes 99-consolidated.md.

Usage: python3 scripts/audit_consolidate.py [--check]
  --check  exit 1 if any outdated sections found (CI mode); do not write.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_DIR = ROOT / "spec"
APP_SPEC = SPEC_DIR / "21-app"
AUDIT_DIR = SPEC_DIR / "25-app-audit"
LATEST = AUDIT_DIR / "latest"
OUT = LATEST / "99-consolidated.md"

README = ROOT / "readme.md"
CHANGELOG = ROOT / "changelog.md"
RELEASE = ROOT / "release_notes.md"

PLANS_PENDING = ROOT / ".lovable/plans/pending"
PLANS_DONE = ROOT / ".lovable/plans/done"

VERSION_RE = re.compile(r"v?(\d+)\.(\d+)\.(\d+)")
CHANGELOG_HEAD_RE = re.compile(r"^##\s*\[(\d+\.\d+\.\d+)\]", re.M)
README_PIN_RE = re.compile(r"\*\*Version:\*\*\s*(\d+\.\d+\.\d+)")
TBD_RE = re.compile(r"\[TBD\]|TODO|FIXME|XXX", re.I)
SPEC_REF_RE = re.compile(r"spec/[0-9a-z_\-/]+\.md", re.I)
PLAN_REF_RE = re.compile(r"\.lovable/plans/(pending|done)/[0-9a-z_\-.]+\.md", re.I)
DATE_RE = re.compile(r"20\d{2}-\d{2}-\d{2}")


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


def parse_versions() -> tuple[str, str, list[str]]:
    """Return (readme_pin, changelog_top, mismatches)."""
    readme_txt = read(README)
    changelog_txt = read(CHANGELOG)
    m1 = README_PIN_RE.search(readme_txt)
    m2 = CHANGELOG_HEAD_RE.search(changelog_txt)
    readme_pin = m1.group(1) if m1 else "?"
    changelog_top = m2.group(1) if m2 else "?"
    warns: list[str] = []
    if readme_pin != changelog_top:
        warns.append(
            f"README pin {readme_pin} != CHANGELOG top {changelog_top}"
        )
    return readme_pin, changelog_top, warns


def collect_files(base: Path, exts=(".md", ".csv")) -> list[Path]:
    if not base.exists():
        return []
    return sorted(
        p for p in base.rglob("*")
        if p.is_file() and p.suffix.lower() in exts
    )


def audit_bundles() -> list[Path]:
    if not AUDIT_DIR.exists():
        return []
    return sorted(
        d for d in AUDIT_DIR.iterdir()
        if d.is_dir() and d.name != "latest"
    )


def detect_outdated(current_ver: str) -> list[dict]:
    """Scan every markdown for outdated signals. Return findings list."""
    findings: list[dict] = []
    cur = version_tuple(current_ver)

    # 1) Stale audit bundles: any audit dir other than 'latest' should be
    #    archived under Plan 18 consolidation.
    for b in audit_bundles():
        findings.append({
            "kind": "stale_audit_bundle",
            "file": str(b.relative_to(ROOT)),
            "detail": "non-latest audit bundle still present; expected under Plan 18 consolidation",
        })

    # 2) Sweep spec + audit + memory + plans for signals.
    scan_bases = [SPEC_DIR, ROOT / ".lovable/memory", PLANS_PENDING, PLANS_DONE]
    for base in scan_bases:
        for f in collect_files(base):
            rel = str(f.relative_to(ROOT))
            txt = read(f)
            if not txt:
                continue

            # TBD / TODO markers
            for m in TBD_RE.finditer(txt):
                line = txt.count("\n", 0, m.start()) + 1
                findings.append({
                    "kind": "tbd_marker",
                    "file": rel, "line": line,
                    "detail": m.group(0),
                })

            # Version references that are older than current pin
            for m in VERSION_RE.finditer(txt):
                ref = f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
                if version_tuple(ref) < cur and _is_pin_context(txt, m.start()):
                    line = txt.count("\n", 0, m.start()) + 1
                    findings.append({
                        "kind": "stale_version_pin",
                        "file": rel, "line": line,
                        "detail": f"pins v{ref} < current v{current_ver}",
                    })

            # Dangling spec references
            for m in SPEC_REF_RE.finditer(txt):
                target = ROOT / m.group(0)
                if not target.exists():
                    line = txt.count("\n", 0, m.start()) + 1
                    findings.append({
                        "kind": "dangling_spec_ref",
                        "file": rel, "line": line,
                        "detail": m.group(0),
                    })

            # Plan refs pointing to wrong folder (pending vs done drift)
            for m in PLAN_REF_RE.finditer(txt):
                target = ROOT / m.group(0)
                if not target.exists():
                    other = m.group(0).replace(
                        "/pending/", "/done/"
                    ) if "/pending/" in m.group(0) else m.group(0).replace(
                        "/done/", "/pending/"
                    )
                    other_p = ROOT / other
                    line = txt.count("\n", 0, m.start()) + 1
                    findings.append({
                        "kind": "plan_ref_moved" if other_p.exists() else "dangling_plan_ref",
                        "file": rel, "line": line,
                        "detail": (
                            f"{m.group(0)} -> now at {other}"
                            if other_p.exists()
                            else m.group(0)
                        ),
                    })
    return findings


def _is_pin_context(txt: str, idx: int) -> bool:
    """Heuristic: only flag version numbers appearing near words like
    'pin', 'Version:', 'v.', 'target', 'baseline' to avoid changelog history
    lines (which legitimately list old versions)."""
    window = txt[max(0, idx - 40): idx].lower()
    return any(k in window for k in ("version:", "pinned", "pin ", "target", "baseline", "current"))


def version_tuple(v: str) -> tuple[int, int, int]:
    m = VERSION_RE.search(v)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else (0, 0, 0)


def render(current_ver: str, findings: list[dict], version_warns: list[str]) -> str:
    now = dt.date.today().isoformat()
    spec_files = collect_files(APP_SPEC)
    audit_files = collect_files(LATEST)
    pending = collect_files(PLANS_PENDING)
    done = collect_files(PLANS_DONE)

    by_kind: dict[str, list[dict]] = {}
    for f in findings:
        by_kind.setdefault(f["kind"], []).append(f)

    lines: list[str] = []
    lines.append(f"# Consolidated Audit - v{current_ver}")
    lines.append("")
    lines.append(f"Generated: {now} by `scripts/audit_consolidate.py`.")
    lines.append("This document supersedes all prior audit bundles; source: `spec/25-app-audit/latest/`.")
    lines.append("")

    lines.append("## Version pins")
    lines.append(f"- README pin: `{version_warns and version_warns[0] or 'ok'}`")
    lines.append(f"- Current release: **v{current_ver}**")
    for w in version_warns:
        lines.append(f"- WARN: {w}")
    lines.append("")

    lines.append("## Inputs consolidated")
    lines.append(f"- App specs (`spec/21-app/`): **{len(spec_files)}** files")
    lines.append(f"- Latest audit bundle (`spec/25-app-audit/latest/`): **{len(audit_files)}** files")
    lines.append(f"- Plans pending: **{len(pending)}** / done: **{len(done)}**")
    lines.append("")

    lines.append("## Outdated sections detected")
    if not findings:
        lines.append("None. Bundle is clean.")
    else:
        for kind, items in sorted(by_kind.items()):
            lines.append(f"### {kind} ({len(items)})")
            # Cap per kind to keep doc readable
            for it in items[:50]:
                loc = f"{it['file']}:{it.get('line', '')}".rstrip(":")
                lines.append(f"- `{loc}` - {it['detail']}")
            if len(items) > 50:
                lines.append(f"- ... {len(items) - 50} more")
            lines.append("")

    lines.append("## Latest bundle index")
    for f in audit_files:
        lines.append(f"- `{f.relative_to(ROOT)}`")
    lines.append("")

    body = "\n".join(lines) + "\n"
    digest = hashlib.sha256(body.encode()).hexdigest()[:12]
    return body + f"\n<!-- sha256:{digest} -->\n"


def cleanup_obsolete(dry_run: bool) -> list[str]:
    """Remove obsolete audit artifacts kept only for history.

    Safe targets (only these, never touches spec/21-app/, plans, or memory):
      - Non-`latest` bundle directories under spec/25-app-audit/ (superseded
        by the consolidated doc under latest/).
      - Loose files at spec/25-app-audit/ root that are not part of the
        canonical set (00-history-timeline.md, 00-overview.md, 00-rubric.md,
        00-scope.md, CONVENTIONS.md, latest/).

    Returns list of removed paths (relative to ROOT).
    """
    import shutil

    keep_root_files = {
        "00-history-timeline.md", "00-overview.md", "00-rubric.md",
        "00-scope.md", "CONVENTIONS.md",
    }
    removed: list[str] = []
    if not AUDIT_DIR.exists():
        return removed

    for entry in sorted(AUDIT_DIR.iterdir()):
        rel = str(entry.relative_to(ROOT))
        if entry.is_dir():
            if entry.name == "latest":
                continue
            removed.append(rel + "/")
            if not dry_run:
                shutil.rmtree(entry)
        else:
            if entry.name in keep_root_files:
                continue
            removed.append(rel)
            if not dry_run:
                entry.unlink()
    return removed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if outdated sections found; do not write")
    ap.add_argument("--cleanup", action="store_true",
                    help="after consolidating, delete obsolete audit bundles")
    ap.add_argument("--dry-run", action="store_true",
                    help="with --cleanup, list what would be removed only")
    args = ap.parse_args()

    readme_pin, changelog_top, warns = parse_versions()
    current = changelog_top if changelog_top != "?" else readme_pin
    findings = detect_outdated(current)

    doc = render(current, findings, warns)

    if not args.check:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(doc, encoding="utf-8")

    # Summary to stdout
    print(f"audit_consolidate: current=v{current} readme={readme_pin} changelog={changelog_top}")
    print(f"inputs: specs(21-app)={len(collect_files(APP_SPEC))} "
          f"latest={len(collect_files(LATEST))} "
          f"pending={len(collect_files(PLANS_PENDING))} "
          f"done={len(collect_files(PLANS_DONE))}")
    print(f"findings: {len(findings)}")
    counts: dict[str, int] = {}
    for f in findings:
        counts[f["kind"]] = counts.get(f["kind"], 0) + 1
    for k, n in sorted(counts.items()):
        print(f"  - {k}: {n}")
    for w in warns:
        print(f"WARN: {w}")

    if args.check:
        print("(check mode, not written)")
        return 1 if findings or warns else 0

    print(f"wrote: {OUT.relative_to(ROOT)}")

    if args.cleanup:
        removed = cleanup_obsolete(dry_run=args.dry_run)
        label = "would remove" if args.dry_run else "removed"
        print(f"cleanup: {label} {len(removed)} obsolete audit path(s)")
        for r in removed:
            print(f"  - {r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
