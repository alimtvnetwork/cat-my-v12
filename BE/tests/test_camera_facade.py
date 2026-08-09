"""Tests for `BE.sdk_facade.camera.InMemoryCameraFacade` (Plan 88 Step 21).

Covers the full Daheng MERCURY2-shaped surface documented in
`sdk/daheng-galaxy-sdk-manual.md` §2: enumeration, open/close, streaming lifecycle,
sensor-config validation, trigger model, and opto-isolated I/O.
"""

from __future__ import annotations

import pytest

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade import (
    CameraFacade,
    DeviceInfo,
    PixelFormat,
    Roi,
    TriggerActivation,
    TriggerMode,
    TriggerSource,
)
from BE.sdk_facade.camera import InMemoryCameraFacade

SERIAL = "SN-STUB-0000"


def _opened() -> InMemoryCameraFacade:
    cam = InMemoryCameraFacade()
    cam.open(SERIAL)
    return cam


def test_satisfies_camera_facade_protocol() -> None:
    assert isinstance(InMemoryCameraFacade(), CameraFacade)


# ---------- enumeration & lifecycle ----------


def test_list_devices_returns_daheng_shaped_roster() -> None:
    devices = InMemoryCameraFacade().list_devices()
    assert [d.serial for d in devices] == ["SN-STUB-0000", "SN-STUB-0001"]
    for d in devices:
        assert isinstance(d, DeviceInfo)
        assert d.vendor == "Daheng"
        assert d.interface == "U3V"


def test_open_unknown_serial_raises_not_connected() -> None:
    with pytest.raises(AppError) as ei:
        InMemoryCameraFacade().open("nope")
    assert ei.value.code == ErrorCode.E_CAM_NOT_CONNECTED


def test_open_second_serial_conflicts() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.open("SN-STUB-0001")
    assert ei.value.code == ErrorCode.E_BE_CONFLICT


def test_close_is_idempotent() -> None:
    cam = _opened()
    cam.close()
    cam.close()  # must not raise


# ---------- streaming & capture ----------


def test_operations_before_open_raise_not_connected() -> None:
    cam = InMemoryCameraFacade()
    for op in (
        lambda: cam.start_stream(),
        lambda: cam.grab(100),
        lambda: cam.set_exposure(1000),
        lambda: cam.set_gain(1.0),
        lambda: cam.set_pixel_format(PixelFormat.MONO8),
    ):
        with pytest.raises(AppError) as ei:
            op()
        assert ei.value.code == ErrorCode.E_CAM_NOT_CONNECTED


def test_grab_without_stream_raises_not_connected() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.grab(100)
    assert ei.value.code == ErrorCode.E_CAM_NOT_CONNECTED


def test_grab_after_stream_raises_capture_failed_not_implemented() -> None:
    cam = _opened()
    cam.start_stream()
    with pytest.raises(AppError) as ei:
        cam.grab(100)
    assert ei.value.code == ErrorCode.E_CAM_CAPTURE_FAILED
    assert "not implemented" in str(ei.value)


def test_grab_rejects_non_positive_timeout() -> None:
    cam = _opened()
    cam.start_stream()
    with pytest.raises(AppError) as ei:
        cam.grab(0)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["node"] == "timeout_ms"


def test_stop_stream_idempotent() -> None:
    cam = _opened()
    cam.stop_stream()
    cam.stop_stream()


# ---------- sensor config validation ----------


def test_set_exposure_out_of_range_reports_bounds() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_exposure(0)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["node"] == "ExposureTime"
    assert {"min", "max", "inc"} <= ei.value.details.keys()


def test_set_gain_out_of_range() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_gain(999.0)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["node"] == "Gain"


def test_set_roi_not_multiple_of_inc() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_roi(Roi(1, 0, 100, 100))
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["node"] == "OffsetX"


def test_set_roi_exceeds_sensor() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_roi(Roi(0, 0, 4000, 4000))
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_set_pixel_format_accepts_enum() -> None:
    cam = _opened()
    cam.set_pixel_format(PixelFormat.BAYER_RG8)  # must not raise


def test_set_pixel_format_rejects_non_enum() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_pixel_format("MONO8")  # type: ignore[arg-type]
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


# ---------- trigger model ----------


def test_software_trigger_requires_on_and_software_source() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.execute_software_trigger()
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST

    cam.set_trigger(TriggerMode.ON, TriggerSource.SOFTWARE, TriggerActivation.RISING_EDGE)
    cam.execute_software_trigger()  # must not raise


# ---------- opto-isolated I/O ----------


def test_line_output_rejects_input_only_line() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.set_line_output("Line0", True)
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["line"] == "Line0"


def test_line_output_roundtrip_on_bidir() -> None:
    cam = _opened()
    cam.set_line_output("Line2", True)
    assert cam.read_line_status("Line2") is True
    cam.set_line_output("Line2", False)
    assert cam.read_line_status("Line2") is False


def test_read_line_status_input_reads_low_on_stub() -> None:
    cam = _opened()
    assert cam.read_line_status("Line0") is False


def test_unknown_line_rejected() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.read_line_status("LineX")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


# ---------- error message enrichment (serial + node) ----------


def test_error_messages_embed_serial_and_node() -> None:
    cam = _opened()
    # gain: node + serial in message
    with pytest.raises(AppError) as ei:
        cam.set_gain(999.0)
    msg = str(ei.value)
    assert "Gain" in msg and SERIAL in msg
    assert ei.value.details["serial"] == SERIAL

    # roi: offending node name in message
    with pytest.raises(AppError) as ei:
        cam.set_roi(Roi(1, 0, 100, 100))
    assert "OffsetX" in str(ei.value) and SERIAL in str(ei.value)

    # unknown line: line + serial in message
    with pytest.raises(AppError) as ei:
        cam.read_line_status("LineX")
    assert "LineX" in str(ei.value) and SERIAL in str(ei.value)

    # grab timeout: parameter name and serial
    cam.start_stream()
    with pytest.raises(AppError) as ei:
        cam.grab(0)
    assert "timeout_ms" in str(ei.value) and SERIAL in str(ei.value)


def test_open_unknown_serial_message_contains_serial() -> None:
    with pytest.raises(AppError) as ei:
        InMemoryCameraFacade().open("nope")
    assert "nope" in str(ei.value)


def test_conflict_message_contains_both_serials() -> None:
    cam = _opened()
    with pytest.raises(AppError) as ei:
        cam.open("SN-STUB-0001")
    msg = str(ei.value)
    assert SERIAL in msg and "SN-STUB-0001" in msg
