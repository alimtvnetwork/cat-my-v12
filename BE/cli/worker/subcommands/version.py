"""Plan 90 Step 52 - `worker-cli version` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`version`).
- Plan 90 file item 51: return `{Name, Version, Commit, BuildDate}` via
  Universal Envelope so PowerShell wrappers and CI verify workflows
  (Step 95) can gate on a machine-readable identity payload.

Contract:
    Result payload (`Results[0]`):
        {
          "Name":      "worker-cli",
          "Version":   <str>,           # from BE/pyproject.toml, injected at
                                        # build via `WORKER_CLI_VERSION` env
                                        # override; fallback reads the toml.
          "Commit":    <str> | "unknown",   # env `WORKER_CLI_COMMIT`
          "BuildDate": <isoZ> | "unknown",  # env `WORKER_CLI_BUILD_DATE`
        }

Rationale for env-first: PyInstaller/CI wraps the entry point with these
three env vars stamped at release build time (Step 85). Local dev keeps
them unset and gets a truthful `"unknown"` rather than a fabricated hash.
The version itself always resolves - falling back to the parsed
pyproject `[project].version` so `worker-cli version` never returns
an empty string.

Side-effect free. No lease reads, no DB touch. Safe to call anywhere.
"""

from __future__ import annotations

import argparse
import os
import tomllib
from functools import cache
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx

_PYPROJECT = Path(__file__).resolve().parents[3] / "pyproject.toml"


@cache
def _pyproject_version() -> str:
    try:
        data = tomllib.loads(_PYPROJECT.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, tomllib.TOMLDecodeError):
        return "0.0.0"
    return str(data.get("project", {}).get("version", "0.0.0"))


def configure(parser: argparse.ArgumentParser) -> None:
    # No flags. Kept for dispatcher symmetry and future --format json|text.
    _ = parser


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    _ = ns
    version = os.environ.get("WORKER_CLI_VERSION") or _pyproject_version()
    commit = os.environ.get("WORKER_CLI_COMMIT") or "unknown"
    build_date = os.environ.get("WORKER_CLI_BUILD_DATE") or "unknown"

    payload = {
        "Name": "worker-cli",
        "Version": version,
        "Commit": commit,
        "BuildDate": build_date,
    }
    ctx.logger.log(
        "INFO", "version.reported",
        f"worker-cli {version} (commit={commit}, built={build_date})",
        ctx=payload,
    )
    return payload


__all__ = ["configure", "handle"]
