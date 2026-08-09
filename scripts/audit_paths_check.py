#!/usr/bin/env python3
"""
Verify that plan, memory index, and active audit paths all agree on the
single consolidated audit source. Exits non-zero on drift.

Canonical source of truth:
  spec/25-app-audit/latest/               (bundle directory)
  spec/25-app-audit/latest/99-consolidated.md   (consolidated document)

Rules enforced:
  1. Canonical bundle dir + consolidated file exist.
  2. readme.md points at spec/25-app-audit/latest/.
  3. .lovable/memory/index.md references spec/25-app-audit/latest/ (not any
     older audit path such as .lovable/memory/audit/ or version-pinned
     bundle dirs).
  4. Pending plans reference only spec/25-app-audit/latest/ when they
     mention the audit bundle (done/ plans are historical, exempt).
  5. No file under spec/25-app-audit/ (outside latest/) shadows the
     canonical bundle with sibling audit dirs.
"""
from __future__ import annotations
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
CANON_DIR = "spec/25-app-audit/latest"
CANON_DOC = f"{CANON_DIR}/99-consolidated.md"

# Legacy / drifted paths that must NOT appear in active references.
LEGACY = [
    re.compile(r"\.lovable/memory/audit/"),
    re.compile(r"spec/25-app-audit/v\d+\.\d+"),      # version-pinned dirs
    re.compile(r"spec/25-app-audit/\d{4}-\d{2}-\d{2}"),  # date-pinned dirs
]

def scan(path: pathlib.Path, must_have_canon: bool) -> list[str]:
    text = path.read_text(errors="ignore")
    errs = []
    for pat in LEGACY:
        for m in pat.finditer(text):
            errs.append(f"{path}: legacy audit path {m.group(0)!r}")
    if must_have_canon and "spec/25-app-audit/" in text and CANON_DIR not in text:
        errs.append(f"{path}: mentions audit bundle but not canonical {CANON_DIR}")
    return errs

def main() -> int:
    errors: list[str] = []

    if not (ROOT / CANON_DIR).is_dir():
        errors.append(f"missing canonical dir: {CANON_DIR}")
    if not (ROOT / CANON_DOC).is_file():
        errors.append(f"missing canonical doc: {CANON_DOC}")

    targets: list[tuple[pathlib.Path, bool]] = [
        (ROOT / "readme.md", True),
        (ROOT / ".lovable/memory/index.md", True),
    ]
    for p in (ROOT / ".lovable/plans/pending").glob("*.md"):
        targets.append((p, False))

    for path, must in targets:
        if path.exists():
            errors.extend(scan(path, must))

    # Sibling drift: only latest/ + top-level *.md allowed under spec/25-app-audit/
    audit_root = ROOT / "spec/25-app-audit"
    if audit_root.is_dir():
        for child in audit_root.iterdir():
            if child.is_dir() and child.name != "latest":
                errors.append(f"stray audit subdir: {child.relative_to(ROOT)}")

    if errors:
        print("audit_paths_check: DRIFT DETECTED")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"audit_paths_check: OK ({CANON_DIR} is single source)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
