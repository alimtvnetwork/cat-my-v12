import pytest

from app.capture.hardware_bridge import (
    Frame,
    HardwareNotReadyError,
    HardwareTimeoutError,
    StubHardwareBridge,
    get_bridge,
    set_bridge,
)


def test_trigger_requires_arm():
    b = StubHardwareBridge()
    with pytest.raises(HardwareNotReadyError):
        b.trigger()


def test_arm_trigger_disarm_cycle():
    b = StubHardwareBridge(width=32, height=16)
    b.arm()
    assert b.is_armed
    f1 = b.trigger()
    f2 = b.trigger()
    assert isinstance(f1, Frame) and f1.frame_id == 1
    assert f2.frame_id == 2
    assert f1.width == 32 and f1.height == 16
    b.disarm()
    assert not b.is_armed


def test_non_positive_deadline_raises_timeout():
    b = StubHardwareBridge()
    b.arm()
    with pytest.raises(HardwareTimeoutError):
        b.trigger(deadline_ms=0)


def test_set_and_get_bridge_roundtrip():
    original = get_bridge()
    try:
        new = StubHardwareBridge()
        set_bridge(new)
        assert get_bridge() is new
    finally:
        set_bridge(original)
