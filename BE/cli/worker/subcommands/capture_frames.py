"""Plan 90 Step 22 - `worker-cli capture-frames` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §"Subcommands" (`capture (single)` + `stream`)
  and §"Acceptance #4" (capture writes an image and emits `frame_ready` IPC).
  This step ships the storage handoff half; `frame_ready` IPC is Step 23.
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract" (single envelope).
- `spec/21-app/52-sdk-facade-pattern.md` (camera -> storage boundary crosses
  ONLY through the Protocols; no vendor imports here).
- `BE/sdk_facade/camera.py` §grab (in-memory stub raises
  `E_CAM_CAPTURE_FAILED` per the "no fabricated frames" guardrail in
  `spec/21-app/40-error-manage.md` §3).
- `BE/sdk_facade/storage.py` §put (opaque, printable, non-slashed keys;
  bytes only; 32 MiB ceiling).

Contract:
    Args:
        --serial          camera serial to open (required).
        --count           target frame count; 0 means "run to duration cap".
        --key-prefix      storage key prefix (default 'captures/<serial>/').
        --provider        memory | vendor (default memory; vendor is Phase 12).
        --exposure-us     optional ExposureTime override before start.
        --gain-db         optional Gain override before start.
        --grab-timeout-ms per-tick blocking budget (default 50).
        --max-duration-ms hard stop for tests / bounded runs (default 2000).

    Result payload (`Results[0]`):
        {
          "Serial": <sn>,
          "FramesEmitted": <int>,        # frames actually grabbed
          "StoredKeys": [<str>, ...],    # storage keys populated this run
          "DurationMs": <int>,
        }

    Honesty rule:
        `E_CAM_CAPTURE_FAILED` from the in-memory facade is an empty tick
        (throttled `capture.tick_empty` INFO log). We do NOT fabricate a
        Frame or a storage blob. Any other AppError propagates.
"""

from __future__ import annotations

import argparse
import threading
import time
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade import Frame
from BE.sdk_facade.camera import InMemoryCameraFacade
from BE.sdk_facade.storage import InMemoryStorageFacade

_TICK_LOG_EVERY_MS = 1000  # throttle empty-tick INFO logs to ~1/s


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--serial", required=True, help="Camera serial to open.")
    parser.add_argument("--count", type=int, default=0,
                        help="Target frame count; 0 = bounded by --max-duration-ms.")
    parser.add_argument("--key-prefix", default=None,
                        help="Storage key prefix (default 'captures/<serial>/').")
    parser.add_argument("--provider", choices=["memory", "vendor"], default="memory")
    parser.add_argument("--exposure-us", type=int, default=None)
    parser.add_argument("--gain-db", type=float, default=None)
    parser.add_argument("--grab-timeout-ms", type=int, default=50)
    parser.add_argument("--max-duration-ms", type=int, default=2000)


def _key_for(prefix: str, frame: Frame) -> str:
    # Deterministic, printable, slash-safe. Includes frame_id and timestamp so
    # replays don't collide; StorageFacade will reject any drift into non-ASCII.
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
    if ns.count < 0:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"--count must be >= 0 (got {ns.count})",
            details={"node": "count", "value": ns.count},
        )
    if ns.max_duration_ms <= 0 and ns.count == 0:
        # Either a frame budget or a time budget MUST be finite; else the loop
        # is a silent forever-run in a batch command. Refuse loudly.
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "capture-frames requires --count>0 or --max-duration-ms>0",
            details={"count": ns.count, "max_duration_ms": ns.max_duration_ms},
        )

    prefix = ns.key_prefix if ns.key_prefix is not None else f"captures/{ns.serial}/"

    camera = InMemoryCameraFacade()
    storage = InMemoryStorageFacade()
    shutdown = threading.Event()

    frames = 0
    empty_ticks = 0
    stored_keys: list[str] = []
    started_ns = time.monotonic_ns()
    last_empty_log_ns = 0

    try:
        camera.open(ns.serial)
        if ns.exposure_us is not None:
            camera.set_exposure(ns.exposure_us)
        if ns.gain_db is not None:
            camera.set_gain(ns.gain_db)
        camera.start_stream()
        ctx.logger.log(
            "INFO", "capture.started",
            f"Capture opened on serial={ns.serial!r}, target_count={ns.count}",
            ctx={"Serial": ns.serial, "TargetCount": ns.count, "KeyPrefix": prefix},
        )

        max_ns = ns.max_duration_ms * 1_000_000 if ns.max_duration_ms > 0 else 0

        while not shutdown.is_set():
            if max_ns and (time.monotonic_ns() - started_ns) >= max_ns:
                break
            if ns.count and frames >= ns.count:
                break

            try:
                frame = camera.grab(ns.grab_timeout_ms)
            except AppError as ae:
                if ae.code is ErrorCode.E_CAM_CAPTURE_FAILED:
                    empty_ticks += 1
                    now_ns = time.monotonic_ns()
                    if (now_ns - last_empty_log_ns) >= _TICK_LOG_EVERY_MS * 1_000_000:
                        ctx.logger.log(
                            "INFO", "capture.tick_empty",
                            f"No frame available on stub (empty_ticks={empty_ticks})",
                            ctx={"Serial": ns.serial, "EmptyTicks": empty_ticks},
                        )
                        last_empty_log_ns = now_ns
                    if shutdown.wait(timeout=ns.grab_timeout_ms / 1000.0):
                        break
                    continue
                raise

            # Real adapter path: hand the frame to storage. Any storage AppError
            # (bad key, oversize, etc.) surfaces to the dispatcher unchanged;
            # we do NOT swallow it and continue silently.
            key = _key_for(prefix, frame)
            storage.put(key, frame.data)
            stored_keys.append(key)
            frames += 1
            ctx.logger.log(
                "INFO", "capture.stored",
                f"Frame {frames} stored at {key!r} ({len(frame.data)} bytes)",
                ctx={
                    "Serial": ns.serial,
                    "FrameIndex": frames,
                    "Key": key,
                    "Bytes": len(frame.data),
                    "Width": frame.width,
                    "Height": frame.height,
                    "PixelFormat": frame.pixel_format.value,
                },
            )
    finally:
        try:
            camera.stop_stream()
        finally:
            camera.close()

    duration_ms = (time.monotonic_ns() - started_ns) // 1_000_000
    ctx.logger.log(
        "INFO", "capture.stopped",
        f"Capture stopped on serial={ns.serial!r} after {duration_ms}ms, frames={frames}",
        ctx={
            "Serial": ns.serial,
            "FramesEmitted": frames,
            "EmptyTicks": empty_ticks,
            "DurationMs": duration_ms,
            "StoredCount": len(stored_keys),
        },
    )

    return {
        "Serial": ns.serial,
        "FramesEmitted": frames,
        "StoredKeys": stored_keys,
        "DurationMs": int(duration_ms),
    }


__all__ = ["configure", "handle"]
