"""Perf-harness CLI - `python -m app.capture.perf_harness_cli --vendor <v>`.

Anchor: spec/21-app/68-v2-vendor-sdk-contract.md §4 (Verification hooks) +
plan `.lovable/plans/pending/17-v2.0.2-vendor-sdk.md` Steps 7-8.

Behavior:
- Builds a `VendorDeviceIO` for the requested vendor (pylon|spinnaker|vimba)
  via its `make_*_device_io` factory, wraps it in a `HardwareBridge`, and
  measures `frames` triggers through `perf_harness_runner.run_with_driver`.
- Writes the report to `tests/reports/perf-<vendor>.json`.
- Enforces the acceptance SLO ONLY when `HARDWARE_ACCEPTANCE=1` is set.
  When unset the CLI prints `skipped: HARDWARE_ACCEPTANCE unset` and exits
  0 without touching the SDK, per spec 68 §4.
- Exits non-zero when `HARDWARE_ACCEPTANCE=1` and either
  `report.p95 > budget` (via `FpsSloError`) or the adapter raises
  `CaptureAdapterError` / `HardwareTimeoutError` / `DeviceDisconnectedError`.
  All errors are logged with the `E_CAP_*` code before exit.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

log = logging.getLogger("perf_harness_cli")

VENDORS = ("pylon", "spinnaker", "vimba")
REPORT_DIR = Path("tests/reports")
HARDWARE_ACCEPTANCE_ENV = "HARDWARE_ACCEPTANCE"


def _build_vendor_io(vendor: str) -> Any:
    if vendor == "pylon":
        from app.capture.pylon_device_io import make_pylon_device_io

        return make_pylon_device_io()
    if vendor == "spinnaker":
        from app.capture.spinnaker_device_io import make_spinnaker_device_io

        return make_spinnaker_device_io()
    if vendor == "vimba":
        from app.capture.vimba_device_io import make_vimba_device_io

        return make_vimba_device_io()
    raise ValueError(f"unknown vendor: {vendor}")


def _write_report(vendor: str, payload: dict[str, Any]) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"perf-{vendor}.json"
    path.write_text(json.dumps(payload, indent=2, sort_keys=True))
    log.info("perf_cli.report_written vendor=%s path=%s", vendor, path)
    return path


def _acceptance_enabled() -> bool:
    return os.environ.get(HARDWARE_ACCEPTANCE_ENV, "") == "1"


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(prog="perf_harness_cli")
    parser.add_argument("--vendor", required=True, choices=VENDORS)
    parser.add_argument("--frames", type=int, default=200)
    parser.add_argument("--deadline-ms", type=int, default=50)
    args = parser.parse_args(argv)

    if not _acceptance_enabled():
        # Spec 68 §4: unset gate -> print + exit 0 (no SDK touch).
        msg = f"skipped: {HARDWARE_ACCEPTANCE_ENV} unset"
        print(msg)
        log.info("perf_cli.skipped vendor=%s reason=env_unset", args.vendor)
        _write_report(args.vendor, {"vendor": args.vendor, "skipped": True, "reason": msg})
        return 0

    # Import runner lazily so the skipped path never touches hardware modules.
    from app.capture.hardware_bridge import (
        DeviceDisconnectedError,
        HardwareBridge,
        HardwareTimeoutError,
    )
    from app.capture.perf_harness import FpsSloError
    from app.capture.perf_harness_runner import run_with_driver
    from app.capture.vendor_device_io import CaptureAdapterError

    try:
        vendor_io = _build_vendor_io(args.vendor)
        bridge = HardwareBridge(device_io=vendor_io)
        report = run_with_driver(
            bridge, frames=args.frames, deadline_ms=args.deadline_ms, enforce=True
        )
    except CaptureAdapterError as exc:
        log.error(
            "perf_cli.failed code=%s vendor=%s detail=%s",
            exc.code, args.vendor, exc.detail,
        )
        _write_report(args.vendor, {"vendor": args.vendor, "error": exc.code, "detail": exc.detail})
        return 2
    except (HardwareTimeoutError, DeviceDisconnectedError) as exc:
        code = "E_CAP_GRAB_TIMEOUT" if isinstance(exc, HardwareTimeoutError) else "E_CAP_DISCONNECTED"
        log.error("perf_cli.failed code=%s vendor=%s type=%s", code, args.vendor, type(exc).__name__)
        _write_report(args.vendor, {"vendor": args.vendor, "error": code, "detail": str(exc)})
        return 3
    except FpsSloError as exc:
        log.error("perf_cli.slo_breach vendor=%s detail=%s", args.vendor, exc)
        _write_report(args.vendor, {"vendor": args.vendor, "error": "E_CAP_FPS_SLO_BREACH", "detail": str(exc)})
        return 4

    payload = {"vendor": args.vendor, "skipped": False, **asdict(report)}
    _write_report(args.vendor, payload)
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
