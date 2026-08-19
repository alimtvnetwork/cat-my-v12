from unittest.mock import MagicMock

import pytest
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.types import FrameEnvelope
from BE.sdk_facade.vendors.daheng.primitives import (
    DahengHandle,
    start_stream,
    stop_stream,
    write_feature,
)


def test_feature_range_mocked() -> None:
    device = MagicMock()
    # Simulate an error on set
    device.Width.set.side_effect = Exception("Out of range")
    handle = DahengHandle(device)

    with pytest.raises(AppError) as exc_info:
        write_feature(handle, "Width", 99999)
    assert exc_info.value.code == ErrorCode.E_BE_BAD_REQUEST

def test_stream_lifecycle_mocked() -> None:
    device = MagicMock()
    raw_image = MagicMock()
    raw_image.convert.return_value.get_numpy_array.return_value = b"data"
    raw_image.get_frame_id.return_value = 1
    device.data_stream[0].get_image.return_value = raw_image

    handle = DahengHandle(device)

    frames_received = []
    def on_frame(env: FrameEnvelope) -> None:
        frames_received.append(env)
        # break the loop gracefully by removing the mock device
        handle.device = None

    start_stream(handle, on_frame)
    # wait a bit for thread
    import time
    time.sleep(0.1)

    # Normally we would stop_stream, but the callback closed it
    stop_stream(handle)
    assert len(frames_received) >= 1

def test_leak_guard(caplog: pytest.LogCaptureFixture) -> None:
    from BE.sdk_facade.vendors.daheng.primitives import _cleanup_handles, _open_handles
    device = MagicMock()
    handle = DahengHandle(device)
    _open_handles.add(handle)

    _cleanup_handles()

    device.close_device.assert_called_once()
    assert "Resource leak: closing dangling Daheng handle" in caplog.text
