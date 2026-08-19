"""Plan 90 Step 46 - `worker-cli stream` subcommand (start | stop).

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`stream start|stop`) and
  §Acceptance #3 / #6 (single-open invariant + exit-code contract).
- Lease: `BE.cli.worker.camera_lease` (Step 45). `stream start` REQUIRES
  the lease to already be held by this host for the requested serial.
  This is the split-phase counterpart to `open-stream` (Step 21) which
  fuses acquire + start + loop + stop + release.
- Marker: `BE.cli.worker.stream_marker` (this step). The marker is the
  only cross-invocation observable of "streaming is nominally active".
  The in-memory facade has no detached grab loop; the vendor adapter
  (Phase 12) will replace this with a real PID/handle.

Sub-verbs (nested argparse):
    stream start --serial <sn>
    stream stop  [--serial <sn>]
    (Both accept --provider and --data-root.)

Result payloads (`Results`):
    start -> {"Serial", "Pid", "RunId", "StartedAt", "AlreadyStreaming"}
    stop  -> {"Stopped": <bool>, "Serial": <str|None>}
"""

from __future__ import annotations

import argparse
import os
from datetime import UTC, datetime
from typing import Any

from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.worker import camera_lease, stream_marker
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _iso_utc() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def configure(parser: argparse.ArgumentParser) -> None:
    sub = parser.add_subparsers(dest="stream_action", required=True, metavar="<action>")

    p_start = sub.add_parser("start", help="Begin a streaming session on the held camera.")
    p_start.add_argument("--serial", required=True, help="Camera serial (must match held lease).")
    p_start.add_argument(
        "--provider", choices=["memory", "vendor"], default="memory",
        help="CameraFacade provider. 'vendor' is Plan 90 Phase 12.",
    )
    p_start.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")

    p_stop = sub.add_parser("stop", help="End the streaming session. Idempotent.")
    p_stop.add_argument("--serial", default=None, help="Expected streaming serial (safety check).")
    p_stop.add_argument(
        "--provider", choices=["memory", "vendor"], default="memory",
        help="CameraFacade provider. 'vendor' is Plan 90 Phase 12.",
    )
    p_stop.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")


def _reject_vendor(ns: argparse.Namespace) -> None:
    if getattr(ns, "provider", "memory") == "vendor":
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "vendor CameraFacade not wired yet (Plan 90 Phase 12)",
            details={"Provider": "vendor"},
        )


def _handle_start(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    _reject_vendor(ns)
    data_root = resolve_root("data", override=ns.data_root, ensure=True)

    # Streaming is only meaningful while the camera lease is held by this
    # host. Refuse (no partial state) if no lease or lease serial mismatch.
    held = camera_lease.peek(data_root)
    if held is None:
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"no camera lease held; run 'worker-cli open --serial {ns.serial}' first",
            details={"RequestedSerial": ns.serial, "HeldSerial": None},
        )
    if held.Serial != ns.serial:
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"lease holds {held.Serial!r}, cannot stream {ns.serial!r}",
            details={"HeldSerial": held.Serial, "RequestedSerial": ns.serial, "HeldPid": held.Pid},
        )

    state, already = stream_marker.start(
        data_root, serial=ns.serial, pid=os.getpid(),
        run_id=ctx.logger.run_id, started_at=_iso_utc(),
    )
    ctx.logger.log(
        "INFO", "stream.started" if not already else "stream.start_noop",
        f"Stream {'already active' if already else 'started'} on serial={ns.serial!r}",
        ctx={"Serial": ns.serial, "Pid": state.Pid, "AlreadyStreaming": already},
    )
    return {
        "Serial": state.Serial,
        "Pid": state.Pid,
        "RunId": state.RunId,
        "StartedAt": state.StartedAt,
        "AlreadyStreaming": already,
    }


def _handle_stop(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    _reject_vendor(ns)
    data_root = resolve_root("data", override=ns.data_root, ensure=True)
    stopped = stream_marker.stop(data_root, expected_serial=ns.serial)
    if stopped is None:
        ctx.logger.log(
            "INFO", "stream.stop_noop",
            "No active stream marker; stop is a no-op",
            ctx={"ExpectedSerial": ns.serial},
        )
        return {"Stopped": False, "Serial": None}
    ctx.logger.log(
        "INFO", "stream.stopped",
        f"Stopped stream on serial={stopped.Serial!r}",
        ctx={"Serial": stopped.Serial, "HeldPid": stopped.Pid},
    )
    return {"Stopped": True, "Serial": stopped.Serial}


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    if ns.stream_action == "start":
        return _handle_start(ns, ctx)
    if ns.stream_action == "stop":
        return _handle_stop(ns, ctx)
    # Argparse `required=True` should prevent this; belt + braces.
    raise AppError(
        ErrorCode.E_CLI_USAGE,
        f"unknown stream action {ns.stream_action!r}",
        details={"Action": ns.stream_action},
    )


__all__ = ["configure", "handle"]
