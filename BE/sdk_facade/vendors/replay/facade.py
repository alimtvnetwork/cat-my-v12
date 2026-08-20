from pathlib import Path

import numpy as np
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade import (
    CameraFacade,
    DeviceInfo,
    Frame,
    PixelFormat,
    Roi,
    TriggerActivation,
    TriggerMode,
    TriggerSource,
)


class ReplayCameraFacade(CameraFacade):
    def __init__(self, fixture_dir: str = "BE/tests/fixtures/daheng"):
        self.fixture_dir = Path(fixture_dir)
        self.files = sorted(self.fixture_dir.glob("*.npy"))
        self._idx = 0
        self._opened = False

    def list_devices(self) -> list[DeviceInfo]:
        return [DeviceInfo("replay-sn", "ReplayModel", "ReplayVendor", "File")]

    def open(self, serial: str) -> None:
        if not self.files:
            raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "No fixture files found")
        self._opened = True

    def close(self) -> None:
        self._opened = False

    def start_stream(self) -> None:
        if not self._opened:
            raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "Not opened")
        self._idx = 0

    def stop_stream(self) -> None:
        pass

    def grab(self, timeout_ms: int) -> Frame:
        if not self._opened:
            raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "Not opened")
        if not self.files:
            raise AppError(ErrorCode.E_CAM_CAPTURE_FAILED, "No more frames")

        file = self.files[self._idx % len(self.files)]
        self._idx += 1
        arr = np.load(file)
        h, w = arr.shape[:2]

        return Frame(
            data=arr.tobytes(),
            width=w,
            height=h,
            pixel_format=PixelFormat.Rgb8,
            timestamp_ns=0,
            frame_id=self._idx
        )

    def set_exposure(self, microseconds: int) -> None: pass
    def set_gain(self, decibels: float) -> None: pass
    def set_roi(self, roi: Roi) -> None: pass
    def set_pixel_format(self, fmt: PixelFormat) -> None: pass
    def set_trigger(self, mode: TriggerMode, source: TriggerSource = TriggerSource.Software, activation: TriggerActivation = TriggerActivation.RisingEdge) -> None: pass
    def execute_software_trigger(self) -> None: pass
    def read_line_status(self, line: str) -> bool: return False
    def set_line_output(self, line: str, on: bool) -> None: pass
