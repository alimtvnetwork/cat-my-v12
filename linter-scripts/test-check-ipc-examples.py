#!/usr/bin/env python3
"""Regression harness for check-ipc-examples.py."""
from __future__ import annotations
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECKER = HERE / "check-ipc-examples.py"
FIXTURES = HERE / "fixtures" / "ipc-examples"

CASES = [
    ("good", 0, ["OK IPC example payloads"]),
    ("bad",  1, ["const 'home.summary.read'", "unexpected property 'leak'", "no schema $defs entry for 'nope.missing.req'"]),
]

def main() -> int:
    fails: list[str] = []
    for name, expect, markers in CASES:
        r = subprocess.run(
            [sys.executable, str(CHECKER), "--repo-root", str(FIXTURES / name)],
            capture_output=True, text=True,
        )
        out = r.stdout + r.stderr
        if r.returncode != expect:
            fails.append(f"[{name}] exit {r.returncode} != {expect}\n{out}"); print(f"FAIL {name}"); continue
        missing = [m for m in markers if m not in out]
        if missing:
            fails.append(f"[{name}] missing markers {missing}\n{out}"); print(f"FAIL {name}"); continue
        print(f"PASS {name}")
    if fails:
        print("\n".join(fails)); return 1
    print(f"OK {len(CASES)} fixture case(s) passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
