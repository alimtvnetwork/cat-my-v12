#!/usr/bin/env python3
"""Regression harness for check-ui-backend-map.py.

Runs the checker against each fixture repo under
`linter-scripts/fixtures/ui-backend-map/` and asserts the expected exit code
and error markers. Zero external dependencies.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECKER = HERE / "check-ui-backend-map.py"
FIXTURES = HERE / "fixtures" / "ui-backend-map"

# name -> (extra_args, expect_exit, must_contain)
CASES = [
    ("good", [], 0, ["OK UI backend map"]),
    ("good", ["--strict-schema"], 0, ["OK UI backend map"]),
    ("bad-missing-defs", ["--strict-schema"], 1, ["missing schema $defs"]),
    ("bad-orphan-diagram", [], 1, ["orphan diagram method: ghost.method"]),
    ("bad-unmapped-caller", [], 1, ["caller file has no map row: src/routes/extra.tsx"]),
]


def run_case(name: str, extra: list[str], expect_exit: int, must_contain: list[str]) -> str | None:
    root = FIXTURES / name
    if not root.is_dir():
        return f"fixture missing: {root}"
    result = subprocess.run(
        [sys.executable, str(CHECKER), "--repo-root", str(root), *extra],
        capture_output=True,
        text=True,
    )
    output = result.stdout + result.stderr
    if result.returncode != expect_exit:
        return f"exit {result.returncode} != expected {expect_exit}\n{output}"
    for marker in must_contain:
        if marker not in output:
            return f"missing marker {marker!r} in output:\n{output}"
    return None


def main() -> int:
    failures: list[str] = []
    for name, extra, expect_exit, must_contain in CASES:
        label = f"{name} {' '.join(extra) or '(default)'}"
        error = run_case(name, extra, expect_exit, must_contain)
        if error:
            failures.append(f"[FAIL] {label}: {error}")
            print(f"FAIL {label}")
        else:
            print(f"PASS {label}")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"OK {len(CASES)} fixture case(s) passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
