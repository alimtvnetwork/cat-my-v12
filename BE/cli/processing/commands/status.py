"""Plan 90 Step 63 - `processing-cli status` read-only reporter.

Anchors:
- `spec/21-app/75-processing-cli.md` §Subcommands (`status`).
- `spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol" (drop-dir layout).
- Shared root resolver: `BE/cli/common/paths.py:resolve_root`.
- Drop-dir names: `BE/cli/common/ipc_bootstrap.py:DROP_DIRS`.

Read-only, side-effect free (no `ensure=True`, no directory creation).
Every observable is peeked. When a root or drop-dir is missing, the
report surfaces `Exists=False` instead of trying to fabricate it - the
substrate for that materialisation is `ipc-bootstrap` / `doctor`, not
`status`.

Contract:
    Args:
        --log-root   override APP_LOG_ROOT (tests).
        --db-root    override APP_DB_ROOT (tests).
        --ipc-root   override APP_IPC_ROOT (tests).
        --data-root  override APP_DATA_ROOT (tests).

    Result payload (`Results[0]`):
        {
          "LogRoot":  {"Path": <str>, "Exists": <bool>},
          "DbRoot":   {"Path": <str>, "Exists": <bool>},
          "IpcRoot":  {"Path": <str>, "Exists": <bool>},
          "DataRoot": {"Path": <str>, "Exists": <bool>},
          "Drops": [
            {"Name": "worker-out",     "Path": <str>, "Exists": <bool>, "PendingCount": <int>},
            {"Name": "processing-in",  ...},
            {"Name": "processing-out", ...},
            {"Name": "main-in",        ...},
          ],
          "ResultsDir": {"Path": <str>, "Exists": <bool>, "SessionCount": <int>},
        }
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from BE.cli.common.ipc_bootstrap import DROP_DIRS
from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--log-root", default=None, help="Override APP_LOG_ROOT (tests).")
    parser.add_argument("--db-root", default=None, help="Override APP_DB_ROOT (tests).")
    parser.add_argument("--ipc-root", default=None, help="Override APP_IPC_ROOT (tests).")
    parser.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")


def _peek_root(kind: str, override: str | None) -> dict[str, Any]:
    # ensure=False: status must never mutate the filesystem.
    path = resolve_root(kind, override=override, ensure=False)  # type: ignore[arg-type]
    return {"Path": str(path), "Exists": path.is_dir()}


def _peek_drop(root: Path, name: str) -> dict[str, Any]:
    p = root / name
    exists = p.is_dir()
    pending = 0
    if exists:
        try:
            # Match `ipc.py` producer convention: `*.json` payloads only.
            pending = sum(1 for _ in p.glob("*.json"))
        except OSError:
            pending = 0
    return {"Name": name, "Path": str(p), "Exists": exists, "PendingCount": pending}


def _peek_results(data_root: Path) -> dict[str, Any]:
    p = data_root / "results"
    exists = p.is_dir()
    sessions = 0
    if exists:
        try:
            sessions = sum(1 for entry in p.iterdir() if entry.is_dir())
        except OSError:
            sessions = 0
    return {"Path": str(p), "Exists": exists, "SessionCount": sessions}


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    log = _peek_root("log", ns.log_root)
    db = _peek_root("db", ns.db_root)
    ipc = _peek_root("ipc", ns.ipc_root)
    data = _peek_root("data", ns.data_root)

    ipc_path = Path(ipc["Path"])
    drops = [_peek_drop(ipc_path, name) for name in DROP_DIRS]

    results = _peek_results(Path(data["Path"]))

    payload = {
        "LogRoot": log,
        "DbRoot": db,
        "IpcRoot": ipc,
        "DataRoot": data,
        "Drops": drops,
        "ResultsDir": results,
    }

    ctx.logger.log(
        "INFO", "status.reported",
        (
            f"status: ipc_root_exists={ipc['Exists']}, "
            f"pending_frames={sum(d['PendingCount'] for d in drops if d['Name'] == 'processing-in')}, "
            f"result_sessions={results['SessionCount']}"
        ),
        ctx={
            "IpcRootExists": ipc["Exists"],
            "DbRootExists": db["Exists"],
            "DropExists": {d["Name"]: d["Exists"] for d in drops},
        },
    )
    return payload


__all__ = ["configure", "handle"]
