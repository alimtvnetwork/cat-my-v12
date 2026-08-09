#!/usr/bin/env python3
"""Plan 20 Blind-AI rescore of audit-retention specs.

Scope: `spec/21-app/{40-error-manage,51-security-and-config-modules,68-v2-audit-retention}.md`.
Rubric mirrors scripts/rescore_plan26.py (5 checks x 20 pts).

  1. `## Acceptance Checklist` present.
  2. `Facade Binding` present; waived for 40 and 51 (registry / cross-cutting).
  3. Explicit reference to both `I_SEC_AUDIT_PRUNED` and `E_SEC_RETENTION_FAILED`.
  4. No PascalCase enum-type drift (regex: `<PascalCase>Enum\\b`).
  5. All `E_*/W_*/I_*` references are registered in `40-error-manage.md`.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_DIR = ROOT / "spec" / "21-app"
OUT = ROOT / "spec" / "25-app-audit" / "latest" / "plan20" / "00-rescore.json"

FILES = [
    "40-error-manage.md",
    "51-security-and-config-modules.md",
    "68-v2-audit-retention.md",
]
FACADE_WAIVED = {"40-error-manage.md", "51-security-and-config-modules.md"}

CODE_RE = re.compile(r"\b([EWI]_[A-Z0-9]+(?:_[A-Z0-9]+)+)\b")
ENUM_DRIFT_RE = re.compile(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)Enum\b")


def load_registered() -> set[str]:
    text = (SPEC_DIR / "40-error-manage.md").read_text(encoding="utf-8")
    return set(CODE_RE.findall(text))


def score(path: Path, registered: set[str]) -> dict:
    text = path.read_text(encoding="utf-8")
    name = path.name
    checks: dict[str, bool | None] = {}
    checks["acceptance_checklist"] = "## Acceptance Checklist" in text
    if name in FACADE_WAIVED:
        checks["facade_binding"] = None
    else:
        checks["facade_binding"] = bool(re.search(r"[Ff]acade\s+[Bb]inding", text))
    checks["retention_codes"] = (
        "I_SEC_AUDIT_PRUNED" in text and "E_SEC_RETENTION_FAILED" in text
    ) if name == "68-v2-audit-retention.md" else None
    checks["no_enum_drift"] = not ENUM_DRIFT_RE.search(text)
    used = set(CODE_RE.findall(text))
    unregistered = sorted(c for c in used if c not in registered)
    checks["codes_registered"] = len(unregistered) == 0

    active = [v for v in checks.values() if v is not None]
    weight = 100 / len(active) if active else 0
    passes = sum(1 for v in active if v)
    total = round(passes * weight, 2)
    return {
        "file": name,
        "checks": checks,
        "unregistered_codes": unregistered,
        "score": total,
    }


def main() -> int:
    registered = load_registered()
    results = [score(SPEC_DIR / f, registered) for f in FILES]
    mean = round(sum(r["score"] for r in results) / len(results), 2)
    blockers = [r["file"] for r in results if r["score"] < 100]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "plan": "20",
                "files": results,
                "mean": mean,
                "blockers": blockers,
                "threshold_pass": mean == 100 and not blockers,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"mean": mean, "blockers": blockers}))
    return 0 if mean == 100 and not blockers else 1


if __name__ == "__main__":
    raise SystemExit(main())
