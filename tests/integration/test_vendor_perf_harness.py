"""SS-07 / SS-05: Perf harness — CI-lite median FPS gate (Plan 25 Step 7).

Drives `ReferenceCaptureDriver` bound to a `VendorDeviceIO` backed by
a `FakeVendorSdk` (no physical camera, no vendor SDK import) through the
production `perf_harness_runner.run_with_driver`. Runs the harness for
each vendor (`pylon`, `spinnaker`, `vimba`) and asserts the achieved fps
clears the 77 fps SLO defined in `app/capture/perf_harness.TARGET_FPS`.

Also records p50 / p95 / p99 and writes an evidence snapshot to
`.lovable/memory/v2/plan25/06-perf-harness.md` so the SLO signal is
pinned in memory per plan Step 7 verification.
"""
from __future__ import annotations

import datetime as _dt
from pathlib import Path

import pytest

from app.capture.perf_harness import TARGET_FPS
from app.capture.perf_harness_runner import run_with_driver
from app.capture.reference_driver import ReferenceCaptureDriver
from app.capture.vendor_device_io import VendorDeviceIO


# --- Zero-cost fake vendor SDK (returns a fixed frame instantly) ----------

class FakeVendorSdk:
    def __init__(self) -> None:
        self._open = False
        self.frame = b"\x00" * (640 * 480)

    def start(self) -> None:
        self._open = True

    def stop(self) -> None:
        self._open = False

    def is_streaming(self) -> bool:
        return self._open

    def grab_frame(self, _timeout_ms: int) -> bytes:
        if not self._open:
            raise RuntimeError("not streaming")
        return self.frame


def _vendor_driver(vendor: str) -> ReferenceCaptureDriver:
    cam = FakeVendorSdk()
    io = VendorDeviceIO(
        handle=cam,
        open_fn=lambda h: h.start(),
        close_fn=lambda h: h.stop(),
        grab_fn=lambda h, ms: h.grab_frame(ms),
        is_connected_fn=lambda h: h.is_streaming(),
        is_timeout=lambda _e: False,
        is_disconnect=lambda _e: False,
        vendor=vendor,
    )
    return ReferenceCaptureDriver(io=io)


VENDORS = ("pylon", "spinnaker", "vimba")
FRAMES = 500


@pytest.fixture(scope="module")
def perf_reports() -> dict[str, object]:
    return {}


@pytest.mark.parametrize("vendor", VENDORS)
def test_vendor_perf_meets_77_fps(vendor: str, perf_reports: dict[str, object]) -> None:
    driver = _vendor_driver(vendor)
    report = run_with_driver(driver, frames=FRAMES, deadline_ms=25, enforce=False)
    perf_reports[vendor] = report
    assert report.achieved_fps >= TARGET_FPS, (
        f"{vendor}: achieved {report.achieved_fps:.1f} fps < {TARGET_FPS} "
        f"(p50={report.p50_ms:.3f}ms p95={report.p95_ms:.3f}ms)"
    )


def test_pin_perf_evidence(perf_reports: dict[str, object]) -> None:
    """Write the per-vendor median + p95 snapshot to plan memory."""
    assert set(perf_reports) == set(VENDORS), "vendor perf tests must run first"

    lines: list[str] = [
        "# Plan 25 SS-07 — Perf harness (CI-lite)",
        "",
        f"Timestamp (UTC): {_dt.datetime.now(_dt.timezone.utc).isoformat()}",
        f"Backend: `FakeVendorSdk` → `VendorDeviceIO` → `ReferenceCaptureDriver` (no vendor SDK, no hardware).",
        f"Frames per run: {FRAMES}. Target: median achieved_fps >= {TARGET_FPS}.",
        "",
        "| Vendor | frames | achieved_fps | p50 ms | p95 ms | p99 ms | pass |",
        "|---|---:|---:|---:|---:|---:|:---:|",
    ]
    for vendor in VENDORS:
        r = perf_reports[vendor]
        ok = "✅" if r.achieved_fps >= TARGET_FPS else "❌"
        lines.append(
            f"| {vendor} | {r.frames} | {r.achieved_fps:.1f} | "
            f"{r.p50_ms:.3f} | {r.p95_ms:.3f} | {r.p99_ms:.3f} | {ok} |"
        )
    lines += [
        "",
        "Note: synthetic in-process grabs; the harness measures the "
        "`ReferenceCaptureDriver` → `VendorDeviceIO` seam, not raw silicon. "
        "Real-camera runs replace `FakeVendorSdk` with a vendor binding under `extras/vendors/*`.",
        "",
    ]
    out = Path(".lovable/memory/v2/plan25/06-perf-harness.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
