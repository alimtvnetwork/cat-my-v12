"""Plan 90 Step 45 - `worker-cli open` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`open`), §Acceptance #3
  (single-open invariant; conflict envelope uses `E_BE_CONFLICT`).
- Lease implementation: `BE.cli.worker.camera_lease` (this plan Step 45).
- Facade contract: `BE.sdk_facade.camera.InMemoryCameraFacade.open`
  validates the serial against `_KNOWN_SERIALS` and raises
  `E_CAM_NOT_CONNECTED` for unknown serials.

Behavior:
- Validates the serial exists in the facade catalog by opening + closing
  the in-process facade under a `try/finally`. This gives the operator
  an early `E_CAM_NOT_CONNECTED` envelope BEFORE any lease is written,
  so a bad serial never poisons the lease file.
- After validation, writes the cross-invocation lease. Idempotent for
  same-serial re-acquire; conflicts raise `E_BE_CONFLICT`.
- Stale-PID reclaim is logged as `lease.reclaimed` (Event).

Result payload (`Results`):
    {"Serial": <sn>, "Pid": <int>, "RunId": <str>, "AcquiredAt": <isoZ>, "Reclaimed": <bool>}
"""

from __future__ import annotations

import argparse
import os
from typing import Any

from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.worker import camera_lease
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.camera import InMemoryCameraFacade


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--serial", required=True, help="Camera serial to lease.")
    parser.add_argument(
        "--provider", choices=["memory", "vendor"], default="memory",
        help="CameraFacade provider. 'vendor' is Plan 90 Phase 12.",
    )
    parser.add_argument(
        "--data-root", default=None,
        help="Override APP_DATA_ROOT for lease storage (tests).",
    )


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    if ns.provider == "vendor":
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "vendor CameraFacade not wired yet (Plan 90 Phase 12)",
            details={"Provider": "vendor"},
        )

    # Validate serial against the facade catalog first so bad serials
    # never touch the lease file. facade.open() raises E_CAM_NOT_CONNECTED
    # for unknown serials; we intentionally do NOT catch it.
    facade = InMemoryCameraFacade()
    facade.open(ns.serial)
    facade.close()

    data_root = resolve_root("data", override=ns.data_root, ensure=True)
    lease, reclaimed = camera_lease.acquire(
        data_root, serial=ns.serial, pid=os.getpid(), run_id=ctx.logger.run_id,
    )
    if reclaimed:
        ctx.logger.log(
            "INFO", "lease.reclaimed",
            f"Reclaimed stale camera lease for {ns.serial!r} (previous holder pid was dead)",
            ctx={"Serial": ns.serial},
        )
    ctx.logger.log(
        "INFO", "camera.opened",
        f"Acquired camera lease for serial={ns.serial!r}",
        ctx={"Serial": ns.serial, "Pid": lease.Pid, "RunId": lease.RunId},
    )
    return {
        "Serial": lease.Serial,
        "Pid": lease.Pid,
        "RunId": lease.RunId,
        "AcquiredAt": lease.AcquiredAt,
        "Reclaimed": reclaimed,
    }


__all__ = ["configure", "handle"]
