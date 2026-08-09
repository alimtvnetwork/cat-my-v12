"""Plan 90 Step 47 - `worker-cli capture` single-shot subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §Subcommands (`capture (single)`) and
  §Acceptance #4 (capture writes an image via the storage facade).
- Lease: `BE.cli.worker.camera_lease` (Step 45). Capture REQUIRES the
  cross-invocation lease to already be held by this host for the
  requested serial, else `E_BE_CONFLICT`.
- Marker: `BE.cli.worker.stream_marker` (Step 46). Capture REFUSES when
  a stream marker is active (single-activity invariant), else the vendor
  grab loop and the single-shot grab would race for the same handle.
- Facade contracts:
    * `BE.sdk_facade.camera.InMemoryCameraFacade.grab` raises
      `E_CAM_CAPTURE_FAILED` per the "no fabricated frames" rule
      (`BE/sdk_facade/camera.py:107`). Vendor adapter overrides this in
      Phase 12.
    * `BE.sdk_facade.storage.InMemoryStorageFacade.put` validates key
      shape and the 32 MiB ceiling.

Contract:
    Args:
        --serial          camera serial (must match held lease).
        --key-prefix      storage key prefix (default 'captures/<serial>/').
        --provider        memory | vendor (default memory; vendor Phase 12).
        --exposure-us     optional ExposureTime override before start.
        --gain-db         optional Gain override before start.
        --grab-timeout-ms per-tick blocking budget (default 200).
        --data-root       override APP_DATA_ROOT (tests).

    Result payload (`Results[0]`):
        {
          "Serial", "Key", "Bytes", "Width", "Height",
          "PixelFormat", "FrameId", "TimestampNs"
        }

Honesty rule:
    On the in-memory facade `grab()` raises `E_CAM_CAPTURE_FAILED`. We do
    NOT catch it or fabricate a Frame; it surfaces to the dispatcher as
    `ExitCode.VendorError` per `_VENDOR_CODES` mapping.
"""

from __future__ import annotations

import argparse
from typing import Any

from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.worker import camera_lease, stream_marker
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade import Frame
from BE.sdk_facade.camera import InMemoryCameraFacade
from BE.sdk_facade.storage import InMemoryStorageFacade


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--serial", required=True, help="Camera serial (must match held lease).")
    parser.add_argument("--key-prefix", default=None,
                        help="Storage key prefix (default 'captures/<serial>/').")
    parser.add_argument("--provider", choices=["memory", "vendor"], default="memory")
    parser.add_argument("--exposure-us", type=int, default=None)
    parser.add_argument("--gain-db", type=float, default=None)
    parser.add_argument("--grab-timeout-ms", type=int, default=200)
    parser.add_argument("--data-root", default=None, help="Override APP_DATA_ROOT (tests).")


def _key_for(prefix: str, frame: Frame) -> str:
    return f"{prefix}{frame.frame_id:08d}-{frame.timestamp_ns}.{frame.pixel_format.value}"


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    if ns.provider == "vendor":
        raise AppError(
            ErrorCode.E_CLI_UNSUPPORTED_HOST,
            "vendor CameraFacade not wired yet (Plan 90 Phase 12)",
            details={"Provider": "vendor"},
        )
    if ns.grab_timeout_ms <= 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"--grab-timeout-ms must be > 0 (got {ns.grab_timeout_ms})",
            details={"node": "grab_timeout_ms", "value": ns.grab_timeout_ms},
        )

    data_root = resolve_root("data", override=ns.data_root, ensure=True)

    # Preflight #1: lease must be held by this host for the requested serial.
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
            f"lease holds {held.Serial!r}, cannot capture on {ns.serial!r}",
            details={"HeldSerial": held.Serial, "RequestedSerial": ns.serial, "HeldPid": held.Pid},
        )

    # Preflight #2: refuse if a stream is nominally active. Single-activity
    # invariant: a running stream owns the vendor grab loop; a single-shot
    # would fight it for the handle.
    marker = stream_marker.peek(data_root)
    if marker is not None:
        raise AppError(
            ErrorCode.E_BE_CONFLICT,
            f"stream is active on {marker.Serial!r}; stop it before single-shot capture",
            details={
                "HeldSerial": marker.Serial, "HeldPid": marker.Pid,
                "HeldRunId": marker.RunId, "RequestedSerial": ns.serial,
            },
        )

    prefix = ns.key_prefix if ns.key_prefix is not None else f"captures/{ns.serial}/"

    camera = InMemoryCameraFacade()
    storage = InMemoryStorageFacade()

    try:
        camera.open(ns.serial)
        if ns.exposure_us is not None:
            camera.set_exposure(ns.exposure_us)
        if ns.gain_db is not None:
            camera.set_gain(ns.gain_db)
        camera.start_stream()
        ctx.logger.log(
            "INFO", "capture.opened",
            f"Single-shot capture opened on serial={ns.serial!r}",
            ctx={"Serial": ns.serial, "KeyPrefix": prefix, "GrabTimeoutMs": ns.grab_timeout_ms},
        )
        # No swallow: E_CAM_CAPTURE_FAILED from the stub surfaces upward.
        frame = camera.grab(ns.grab_timeout_ms)
        key = _key_for(prefix, frame)
        storage.put(key, frame.data)
        ctx.logger.log(
            "INFO", "capture.stored",
            f"Frame stored at {key!r} ({len(frame.data)} bytes)",
            ctx={
                "Serial": ns.serial, "Key": key, "Bytes": len(frame.data),
                "Width": frame.width, "Height": frame.height,
                "PixelFormat": frame.pixel_format.value,
                "FrameId": frame.frame_id, "TimestampNs": frame.timestamp_ns,
            },
        )
    finally:
        try:
            camera.stop_stream()
        finally:
            camera.close()

    return {
        "Serial": ns.serial,
        "Key": key,
        "Bytes": len(frame.data),
        "Width": frame.width,
        "Height": frame.height,
        "PixelFormat": frame.pixel_format.value,
        "FrameId": frame.frame_id,
        "TimestampNs": frame.timestamp_ns,
    }


__all__ = ["configure", "handle"]
