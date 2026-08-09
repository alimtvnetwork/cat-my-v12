"""Plan 17 Step 9b: vendor adapter buffer-ownership.

Anchor: spec/21-app/68-v2-vendor-sdk-contract.md §2. Every `_grab` MUST
return a caller-owned bytes copy and MUST release the SDK-owned buffer
before returning (Pylon `result.Release()`, Spinnaker `image.Release()`,
Vimba `camera.queue_frame(frame)`). If the copy step raises, the release
step MUST still run so no vendor-thread reference leaks.
"""
from __future__ import annotations

import pytest

from app.capture import pylon_device_io as pylon
from app.capture import spinnaker_device_io as spin
from app.capture import vimba_device_io as vimba


# -- Helpers ----------------------------------------------------------

class _FakeNumpy:
    """Minimal ndarray-shape: `.tobytes()` returns SDK-owned bytes."""

    def __init__(self, data: bytes) -> None:
        self._data = data
        self.tobytes_calls = 0

    def tobytes(self) -> bytes:
        self.tobytes_calls += 1
        return self._data


# -- Pylon ------------------------------------------------------------

class _PylonResult:
    def __init__(self, payload: object) -> None:
        self.Array = payload
        self.released = 0

    def Release(self) -> None:
        self.released += 1


class _PylonCam:
    def __init__(self, result: _PylonResult) -> None:
        self._result = result
        self.triggered = 0

    def ExecuteSoftwareTrigger(self) -> None:
        self.triggered += 1

    def RetrieveResult(self, _ms: int) -> _PylonResult:
        return self._result


def test_pylon_grab_copies_and_releases_bytes_payload() -> None:
    src = bytearray(b"\x01\x02\x03")
    result = _PylonResult(bytes(src))
    cam = _PylonCam(result)
    out = pylon._grab(cam, 50)
    assert out == b"\x01\x02\x03"
    assert isinstance(out, bytes)
    assert result.released == 1
    # mutating the original SDK buffer MUST NOT change our copy
    src[0] = 0xFF
    assert out[0] == 0x01


def test_pylon_grab_forces_copy_for_ndarray_payload() -> None:
    arr = _FakeNumpy(b"\xAA\xBB")
    result = _PylonResult(arr)
    out = pylon._grab(_PylonCam(result), 50)
    assert out == b"\xAA\xBB"
    assert arr.tobytes_calls == 1
    assert result.released == 1


def test_pylon_grab_releases_even_when_copy_raises() -> None:
    class _Boom:
        def tobytes(self) -> bytes:
            raise RuntimeError("copy failed")

    result = _PylonResult(_Boom())
    with pytest.raises(RuntimeError):
        pylon._grab(_PylonCam(result), 50)
    assert result.released == 1


# -- Spinnaker --------------------------------------------------------

class _SpinImage:
    def __init__(self, payload: object) -> None:
        self._payload = payload
        self.released = 0

    def GetData(self) -> object:
        return self._payload

    def Release(self) -> None:
        self.released += 1


class _SpinCam:
    def __init__(self, image: _SpinImage) -> None:
        self._image = image
        self.TriggerSoftware = self  # supports `.Execute()`
        self.triggered = 0

    def Execute(self) -> None:
        self.triggered += 1

    def GetNextImage(self, _ms: int) -> _SpinImage:
        return self._image


def test_spinnaker_grab_forces_copy_and_releases() -> None:
    arr = _FakeNumpy(b"\x10\x20\x30")
    image = _SpinImage(arr)
    out = spin._grab(_SpinCam(image), 50)
    assert out == b"\x10\x20\x30"
    assert isinstance(out, bytes)
    assert arr.tobytes_calls == 1
    assert image.released == 1


def test_spinnaker_grab_releases_even_when_copy_raises() -> None:
    class _Boom:
        def tobytes(self) -> bytes:
            raise RuntimeError("copy failed")

    image = _SpinImage(_Boom())
    with pytest.raises(RuntimeError):
        spin._grab(_SpinCam(image), 50)
    assert image.released == 1


# -- Vimba ------------------------------------------------------------

class _VimbaFrame:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def as_numpy_ndarray(self) -> _FakeNumpy:
        return _FakeNumpy(self._payload)


class _VimbaCam:
    def __init__(self, frame: _VimbaFrame) -> None:
        self._frame = frame
        self.TriggerSoftware = self
        self.run_calls = 0
        self.queued: list[object] = []

    def run(self) -> None:
        self.run_calls += 1

    def get_frame(self, _ms: int) -> _VimbaFrame:
        return self._frame

    def queue_frame(self, frame: object) -> None:
        self.queued.append(frame)


def test_vimba_grab_returns_copy_and_requeues_frame() -> None:
    frame = _VimbaFrame(b"\x00\xFF")
    cam = _VimbaCam(frame)
    handle = vimba.VimbaHandle(system=object(), camera=cam)
    out = vimba._grab(handle, 50)
    assert out == b"\x00\xFF"
    assert isinstance(out, bytes)
    # Buffer-ownership: the frame MUST be handed back to the SDK ring.
    assert cam.queued == [frame]


def test_vimba_grab_requeues_frame_even_when_copy_raises() -> None:
    class _BoomFrame:
        def as_numpy_ndarray(self) -> object:
            raise RuntimeError("copy failed")

    frame = _BoomFrame()
    cam = _VimbaCam(frame)  # type: ignore[arg-type]
    handle = vimba.VimbaHandle(system=object(), camera=cam)
    with pytest.raises(RuntimeError):
        vimba._grab(handle, 50)
    assert cam.queued == [frame]
