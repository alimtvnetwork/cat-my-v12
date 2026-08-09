import pytest

from app.capture.hardware_bridge import (
    HardwareNotReadyError,
    HardwareTimeoutError,
    set_bridge,
    get_bridge,
    StubHardwareBridge,
)
from app.capture.reference_driver import (
    DeviceDisconnectedError,
    FakeDeviceIO,
    ReferenceCaptureDriver,
)


@pytest.fixture(autouse=True)
def _reset_bridge():
    yield
    set_bridge(StubHardwareBridge())


def _driver(scripted=None, retry_budget=1):
    io = FakeDeviceIO(scripted=list(scripted or []))
    return ReferenceCaptureDriver(io=io, retry_budget=retry_budget), io


def test_trigger_requires_arm():
    drv, _ = _driver()
    with pytest.raises(HardwareNotReadyError):
        drv.trigger()


def test_arm_opens_device_and_trigger_returns_frame():
    drv, io = _driver(scripted=[b"pixels"])
    drv.arm()
    assert io.connected
    frame = drv.trigger()
    assert frame.frame_id == 1
    assert frame.payload == b"pixels"


def test_timeout_within_retry_budget_recovers():
    drv, _ = _driver(scripted=["timeout", b"ok"], retry_budget=1)
    drv.arm()
    frame = drv.trigger()
    assert frame.payload == b"ok"


def test_timeout_budget_exhausted_raises():
    drv, _ = _driver(scripted=["timeout", "timeout"], retry_budget=1)
    drv.arm()
    with pytest.raises(HardwareTimeoutError):
        drv.trigger()


def test_disconnect_is_fatal_and_disarms():
    drv, io = _driver(scripted=["disconnect"])
    drv.arm()
    with pytest.raises(DeviceDisconnectedError):
        drv.trigger()
    assert drv.is_armed is False
    assert io.connected is False


def test_non_positive_deadline_raises_timeout():
    drv, _ = _driver(scripted=[b"x"])
    drv.arm()
    with pytest.raises(HardwareTimeoutError):
        drv.trigger(deadline_ms=0)


def test_disarm_closes_device():
    drv, io = _driver()
    drv.arm()
    drv.disarm()
    assert io.connected is False
    assert drv.is_armed is False


def test_registers_via_set_bridge():
    drv, _ = _driver(scripted=[b"z"])
    set_bridge(drv)
    assert get_bridge() is drv
