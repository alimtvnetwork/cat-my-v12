"""Plan 90 Step 21 - `worker-cli open-stream` subcommand.

Anchors:
- `spec/21-app/74-worker-cli.md` §"Subcommands" (`stream start|stop`)
  and §"Acceptance #6" (exit-code contract).
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract" (single envelope
  on stdout; JSONL log lines via the shared logger).
- `BE/sdk_facade/camera.py` (`open` -> `start_stream` -> `grab` loop ->
  `stop_stream` -> `close`; `grab` on `InMemoryCameraFacade` raises
  `E_CAM_CAPTURE_FAILED` per the "no fabricated frames" guardrail in
  `spec/21-app/40-error-manage.md` §3 and `sdk/daheng-galaxy-sdk-manual.md` §2).

Contract:
    Args:
        --serial          camera serial to open (required).
        --provider        memory | vendor (default memory; vendor is Phase 12).
        --exposure-us     optional ExposureTime override before start.
        --gain-db         optional Gain override before start.
        --grab-timeout-ms per-tick blocking budget (default 50).
        --max-duration-ms hard stop for tests / bounded runs (default 0 = infinite).
        --max-frames      stop after N frames emitted (default 0 = infinite).

    Result payload (`Results`):
        {"Serial": <sn>, "FramesEmitted": <int>, "DurationMs": <int>}

    Shutdown:
        SIGINT / SIGTERM flip a threading.Event. The loop drains the current
        tick and returns cleanly with ExitCode.Ok. Signals are installed only
        when running on the main thread (pytest may run us elsewhere).

    Honesty rule:
        `E_CAM_CAPTURE_FAILED` from the in-memory facade is treated as
        "no frame this tick" (throttled `stream.tick_empty` log). We do NOT
        invent a frame. Any other AppError propagates and maps to a failure
        envelope via the dispatcher.
"""

from __future__ import annotations

import argparse
import signal
import threading
import time
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.camera import InMemoryCameraFacade

_TICK_LOG_EVERY_MS = 1000  # throttle empty-tick INFO logs to ~1/s


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--serial", required=True, help="Camera serial to open.")
    parser.add_argument(
        "--provider", choices=["memory", "vendor"], default="memory",
        help="CameraFacade provider. 'vendor' is Plan 90 Phase 12.",
    )
    parser.add_argument("--exposure-us", type=int, default=None)
    parser.add_argument("--gain-db", type=float, default=None)
    parser.add_argument("--grab-timeout-ms", type=int, default=50)
    parser.add_argument("--max-duration-ms", type=int, default=0)
    parser.add_argument("--max-frames", type=int, default=0)


def _install_signal_handlers(shutdown: threading.Event) -> list[tuple[int, Any]]:
    prior: list[tuple[int, Any]] = []
    if threading.current_thread() is not threading.main_thread():
        return prior

    def _handler(signum: int, _frame: Any) -> None:
        shutdown.set()

    for sig in (signal.SIGINT, getattr(signal, "SIGTERM", None)):
        if sig is None:
            continue
        try:
            prior.append((sig, signal.signal(sig, _handler)))
        except (ValueError, OSError):
            # Windows or restricted env: skip silently, --max-duration-ms bounds tests.
            continue
    return prior


def _restore_signal_handlers(prior: list[tuple[int, Any]]) -> None:
    for sig, handler in prior:
        try:
            signal.signal(sig, handler)
        except (ValueError, OSError):
            continue


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

    facade = InMemoryCameraFacade()
    shutdown = threading.Event()
    prior = _install_signal_handlers(shutdown)

    frames = 0
    empty_ticks = 0
    started_ns = time.monotonic_ns()
    last_empty_log_ns = 0

    try:
        facade.open(ns.serial)
        if ns.exposure_us is not None:
            facade.set_exposure(ns.exposure_us)
        if ns.gain_db is not None:
            facade.set_gain(ns.gain_db)
        facade.start_stream()
        ctx.logger.log(
            "INFO", "stream.started",
            f"Streaming opened on serial={ns.serial!r}",
            ctx={"Serial": ns.serial, "Provider": ns.provider},
        )

        max_duration_ns = ns.max_duration_ms * 1_000_000 if ns.max_duration_ms > 0 else 0

        while not shutdown.is_set():
            if max_duration_ns and (time.monotonic_ns() - started_ns) >= max_duration_ns:
                break
            if ns.max_frames and frames >= ns.max_frames:
                break

            try:
                facade.grab(ns.grab_timeout_ms)
                # Real adapter path: a frame was produced.
                frames += 1
                ctx.logger.log(
                    "INFO", "stream.frame",
                    f"Frame emitted (n={frames})",
                    ctx={"Serial": ns.serial, "FrameIndex": frames},
                )
            except AppError as ae:
                if ae.code is ErrorCode.E_CAM_CAPTURE_FAILED:
                    # In-memory stub: no fabricated frame. Log throttled and continue.
                    empty_ticks += 1
                    now_ns = time.monotonic_ns()
                    if (now_ns - last_empty_log_ns) >= _TICK_LOG_EVERY_MS * 1_000_000:
                        ctx.logger.log(
                            "INFO", "stream.tick_empty",
                            f"No frame available on stub (empty_ticks={empty_ticks})",
                            ctx={"Serial": ns.serial, "EmptyTicks": empty_ticks},
                        )
                        last_empty_log_ns = now_ns
                    # Yield the CPU so bounded test runs terminate quickly.
                    if shutdown.wait(timeout=ns.grab_timeout_ms / 1000.0):
                        break
                    continue
                raise
    finally:
        try:
            facade.stop_stream()
        finally:
            facade.close()
        _restore_signal_handlers(prior)

    duration_ms = (time.monotonic_ns() - started_ns) // 1_000_000
    ctx.logger.log(
        "INFO", "stream.stopped",
        f"Streaming stopped on serial={ns.serial!r} after {duration_ms}ms",
        ctx={
            "Serial": ns.serial,
            "FramesEmitted": frames,
            "EmptyTicks": empty_ticks,
            "DurationMs": duration_ms,
        },
    )

    return {
        "Serial": ns.serial,
        "FramesEmitted": frames,
        "DurationMs": int(duration_ms),
    }


__all__ = ["configure", "handle"]
