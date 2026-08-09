"""Plan 90 Step 48 - `worker-cli status` read-only reporter.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`status`).
- Lease reader: `BE.cli.worker.camera_lease.peek` (Step 45).
- Marker reader: `BE.cli.worker.stream_marker.peek` (Step 46).

Read-only side-effect-free reporter. Every observable is peeked, never
mutated. Corrupt state files still surface as `E_CLI_PREFLIGHT_FAILED`
per each peek's contract (naming the exact `Path`), so operators see
the failure loudly instead of getting a fake "healthy" envelope.

Contract:
    Args:
        --provider   memory | vendor (default memory; vendor Phase 12).
        --data-root  override APP_DATA_ROOT (tests).

    Result payload (`Results[0]`):
        {
          "Provider": "memory",
          "DataRoot": <str>,
          "Lease": {"Serial","Pid","RunId","AcquiredAt","PidAlive"} | None,
          "Stream": {"Serial","Pid","RunId","StartedAt"} | None,
          "StreamStaleLease": <bool>,      # marker present but no lease
          "StreamSerialMismatch": <bool>,  # marker.Serial != lease.Serial
        }
"""

from __future__ import annotations

import argparse
from typing import Any

from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.worker import camera_lease, stream_marker
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--provider", choices=["memory", "vendor"], default="memory")
    parser.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    if ns.provider == "vendor":
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "vendor CameraFacade not wired yet (Plan 90 Phase 12)",
            details={"Provider": "vendor"},
        )
    data_root = resolve_root("data", override=ns.data_root, ensure=True)

    lease = camera_lease.peek(data_root)
    marker = stream_marker.peek(data_root)

    lease_payload: dict[str, Any] | None = None
    if lease is not None:
        lease_payload = {
            "Serial": lease.Serial,
            "Pid": lease.Pid,
            "RunId": lease.RunId,
            "AcquiredAt": lease.AcquiredAt,
            "PidAlive": camera_lease._pid_alive(lease.Pid),
        }

    marker_payload: dict[str, Any] | None = None
    if marker is not None:
        marker_payload = {
            "Serial": marker.Serial,
            "Pid": marker.Pid,
            "RunId": marker.RunId,
            "StartedAt": marker.StartedAt,
        }

    stream_stale_lease = marker is not None and lease is None
    stream_serial_mismatch = (
        marker is not None and lease is not None and marker.Serial != lease.Serial
    )

    ctx.logger.log(
        "INFO", "status.reported",
        f"status: lease={'held' if lease else 'none'}, stream={'active' if marker else 'none'}",
        ctx={
            "LeaseHeld": lease is not None,
            "StreamActive": marker is not None,
            "StreamStaleLease": stream_stale_lease,
            "StreamSerialMismatch": stream_serial_mismatch,
        },
    )

    return {
        "Provider": ns.provider,
        "DataRoot": str(data_root),
        "Lease": lease_payload,
        "Stream": marker_payload,
        "StreamStaleLease": stream_stale_lease,
        "StreamSerialMismatch": stream_serial_mismatch,
    }


__all__ = ["configure", "handle"]
