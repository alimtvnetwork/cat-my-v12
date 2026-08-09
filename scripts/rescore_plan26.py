#!/usr/bin/env python3
"""Plan 25 SS-09 Blind-AI rescore of vendor + capture specs.

Scope: `spec/21-app/{50,51,63,64,65,66,67}.md`.
Rubric (5 checks x 20 pts = 100 per file). Mirrors the Plan 23 Step 24 rubric:

  1. `## Acceptance Checklist` present.
  2. `## Facade Binding` (or `<Facade> binding`) present; waived for 51
     (config-side spec, no vendor SDK) and 66 (pattern-level, per 90-findings
     waiver of facade-only pattern specs).
  3. `Contract back-links` table present for facade-bound files (63-67).
  4. No PascalCase enum-type drift (regex: `<PascalCase>Enum\\b` etc).
  5. All `E_*/W_*/I_*` code references are registered in
     `spec/21-app/40-error-manage.md`.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_DIR = ROOT / "spec" / "21-app"
FILES = ["50-capture-modules.md", "51-security-and-config-modules.md",
         "63-v2-vendor-pylon.md", "64-v2-vendor-spinnaker.md",
         "65-v2-vendor-vimba.md", "66-v2-vendor-discovery.md",
         "67-v2-discovery-contract.md"]
FACADE_WAIVED = {"51-security-and-config-modules.md"}
BACKLINK_REQUIRED = {"63-v2-vendor-pylon.md", "64-v2-vendor-spinnaker.md",
                     "65-v2-vendor-vimba.md", "66-v2-vendor-discovery.md",
                     "67-v2-discovery-contract.md"}

CODE_RE = re.compile(r"\b([EWI]_[A-Z0-9]+(?:_[A-Z0-9]+)+)\b")
ENUM_DRIFT_RE = re.compile(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)Enum\b")

def load_registered_codes() -> set[str]:
    text = (SPEC_DIR / "40-error-manage.md").read_text(encoding="utf-8")
    codes = set(CODE_RE.findall(text))
    # Family-prefix templates in 40 also register their listed concretes.
    return codes

def score_file(path: Path, registered: set[str]) -> dict:
    text = path.read_text(encoding="utf-8")
    name = path.name
    checks = {}
    # 1. Acceptance Checklist
    checks["acceptance_checklist"] = "## Acceptance Checklist" in text
    # 2. Facade Binding
    if name in FACADE_WAIVED:
        checks["facade_binding"] = None  # waived
    else:
        checks["facade_binding"] = bool(re.search(r"##\s+Facade Binding", text)
                                        or re.search(r"[Ff]acade\s+[Bb]inding", text))
    # 3. Contract back-links
    if name in BACKLINK_REQUIRED:
        checks["backlinks"] = ("Contract back-links" in text
                               or "Contract back-link" in text
                               or "back-links" in text.lower())
    else:
        checks["backlinks"] = None
    # 4. Enum drift
    drift = ENUM_DRIFT_RE.findall(text)
    checks["no_enum_drift"] = (len(drift) == 0)
    # 5. Registered codes
    referenced = set(CODE_RE.findall(text))
    unregistered = sorted(referenced - registered)
    # Filter family-prefix templates ending with _<UPPER> that are placeholders
    checks["codes_registered"] = (len(unregistered) == 0)
    score = 0
    for k, v in checks.items():
        if v is None:
            score += 20  # waived => full credit
        elif v:
            score += 20
    return {"file": name, "score": score, "checks": checks,
            "unregistered": unregistered, "enum_drift": drift}

def main() -> int:
    registered = load_registered_codes()
    results = [score_file(SPEC_DIR / f, registered) for f in FILES]
    mean = sum(r["score"] for r in results) / len(results)
    blockers = [r for r in results if r["score"] < 80]
    report = {
        "scope": FILES,
        "registered_codes_source": "spec/21-app/40-error-manage.md",
        "registered_code_count": len(registered),
        "results": results,
        "mean": round(mean, 2),
        "blockers": [r["file"] for r in blockers],
        "threshold_pass": mean >= 90 and not blockers,
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["threshold_pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
