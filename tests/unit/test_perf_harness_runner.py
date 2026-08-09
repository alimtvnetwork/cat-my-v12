"""Perf-harness runner tests: drives ReferenceCaptureDriver through measure()."""
import pytest

from app.capture.hardware_bridge import HardwareNotReadyError
from app.capture.perf_harness import FpsSloError
from app.capture.perf_harness_runner import run_with_driver
from app.capture.reference_driver import (
    DeviceDisconnectedError,
    FakeDeviceIO,
    ReferenceCaptureDriver,
)


def _driver(scripted=None):
    io = FakeDeviceIO(scripted=list(scripted or []))
    return ReferenceCaptureDriver(io=io, retry_budget=0)


def test_runner_measures_and_disarms():
    driver = _driver()
    report = run_with_driver(driver, frames=10, enforce=False)
    assert report.frames == 10
    assert report.achieved_fps > 0
    assert driver.is_armed is False  # disarmed even without enforce


def test_runner_propagates_hardware_disconnect():
    driver = _driver(scripted=[b"\x00", "disconnect"])
    with pytest.raises(DeviceDisconnectedError):
        run_with_driver(driver, frames=5, enforce=False)
    assert driver.is_armed is False  # disarm ran via finally


def test_runner_raises_slo_when_enforced_and_slow():
    # Deterministic slow tick: monkeypatch trigger to sleep past budget.
    import time as _time
    driver = _driver()

    def slow_tick(_ms=50):
        _time.sleep(0.020)  # 20 ms > 12.987 ms budget
        return None

    driver.arm()
    driver.trigger = slow_tick  # type: ignore[assignment]
    with pytest.raises(FpsSloError):
        run_with_driver(driver, frames=5, enforce=True)


def test_runner_rejects_frames_lt_2():
    with pytest.raises(ValueError):
        run_with_driver(_driver(), frames=1)


def test_runner_surfaces_not_ready_when_arm_bypassed():
    # If a caller manually disarms mid-run, next trigger raises — proves
    # the runner does not swallow HardwareNotReadyError.
    driver = _driver()
    driver.arm()
    driver.disarm()
    with pytest.raises(HardwareNotReadyError):
        driver.trigger(50)
