"""Plan 90 Step 45 - `worker-cli close` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`close`), §Acceptance #3
  (close is idempotent).
- Lease implementation: `BE.cli.worker.camera_lease`.

Behavior:
- Idempotent: closing when no lease exists returns success with
  `Released=false`.
- If `--serial` is provided and mismatches the held serial, raises
  `E_BE_CONFLICT`. Without `--serial`, force-releases whatever is held.
"""

from __future__ import annotations

import argparse
from typing import Any

from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.worker import camera_lease


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--serial", default=None, help="Expected held serial (safety check).")
    parser.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    data_root = resolve_root("data", override=ns.data_root, ensure=True)
    released = camera_lease.release(data_root, expected_serial=ns.serial)
    if released is None:
        ctx.logger.log(
            "INFO", "camera.close_noop",
            "No camera lease held; close is a no-op",
            ctx={"ExpectedSerial": ns.serial},
        )
        return {"Released": False, "Serial": None}
    ctx.logger.log(
        "INFO", "camera.closed",
        f"Released camera lease for serial={released.Serial!r}",
        ctx={"Serial": released.Serial, "HeldPid": released.Pid},
    )
    return {"Released": True, "Serial": released.Serial}


__all__ = ["configure", "handle"]
