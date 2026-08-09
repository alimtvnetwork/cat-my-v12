"""Plan 90 Step 71 - cross-CLI console-script parity guard.

Root cause the guard closes: Steps 56/57 pinned `worker-cli` and
`processing-cli` entrypoints independently, but nothing asserts they
stay declared together, share the same `Version` string, or emit
matching `version` envelopes. A future edit that drops one entry, or
lets the two CLIs drift onto different `pyproject` versions, would
break the PowerShell wrappers and release-page install command without
any test failing.

Locks:
    1. `[project.scripts]` in `BE/pyproject.toml` declares BOTH
       console scripts, pinned to their canonical `main` callables.
    2. Both `python -m ... version` invocations exit 0, return a
       Universal Envelope with `Status.IsSuccess=true`, and carry the
       expected `{Name, Version, Commit, BuildDate}` payload.
    3. The two CLIs report the SAME `Version` string (both derive from
       the single `[project].version` in `BE/pyproject.toml`).
"""

from __future__ import annotations

import json
import subprocess
import sys
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PYPROJECT = REPO_ROOT / "BE" / "pyproject.toml"

EXPECTED_SCRIPTS = {
    "worker-cli": "BE.cli.worker.main:main",
    "processing-cli": "BE.cli.processing.main:main",
}


def _scripts() -> dict[str, str]:
    return tomllib.loads(PYPROJECT.read_text(encoding="utf-8")).get(
        "project", {}
    ).get("scripts", {})


def test_both_console_scripts_declared_together():
    scripts = _scripts()
    for name, target in EXPECTED_SCRIPTS.items():
        assert scripts.get(name) == target, (
            f"[project.scripts] must pin {name}={target!r}; "
            f"got {scripts.get(name)!r}. PowerShell wrappers and the "
            "one-line installer resolve both binaries by name."
        )


def _run_version(module: str) -> dict:
    proc = subprocess.run(
        [sys.executable, "-m", module, "version"],
        capture_output=True, text=True, timeout=20, cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 0, (module, proc.returncode, proc.stderr)
    return json.loads(proc.stdout.strip().splitlines()[-1])


def test_version_envelopes_match_shape_and_version_string():
    worker = _run_version("BE.cli.worker.main")
    processing = _run_version("BE.cli.processing.main")

    for name, env in (("worker-cli", worker), ("processing-cli", processing)):
        assert env["Status"]["IsSuccess"] is True, (name, env)
        results = env["Results"]
        assert isinstance(results, list) and len(results) == 1, (name, env)
        v = results[0]
        assert v["Name"] == name, (name, v)
        for key in ("Version", "Commit", "BuildDate"):
            assert isinstance(v.get(key), str) and v[key], (name, key, v)

    # Single source of truth: both CLIs derive Version from the same
    # [project].version in BE/pyproject.toml.
    assert worker["Results"][0]["Version"] == processing["Results"][0]["Version"], (
        worker["Results"][0]["Version"], processing["Results"][0]["Version"],
    )
