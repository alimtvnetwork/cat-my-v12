import time
import logging
from typing import Optional, Callable, Any
from contextlib import ExitStack

from BE.sdk_facade import (
    CameraFacade, DeviceInfo, Frame, Roi, PixelFormat,
    TriggerMode, TriggerSource, TriggerActivation
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from .primitives import (
    enumerate_devices, open_by_serial, start_stream, stop_stream,
    trigger_once, arm_trigger, configure_exposure, configure_gain,
    configure_white_balance, read_line, write_line, configure_roi,
    DahengHandle
)

logger = logging.getLogger(__name__)

class DahengCameraFacade(CameraFacade):
    def __init__(self, correlation_id: str = "none"):
        self._correlation_id = correlation_id
        self._handle: Optional[DahengHandle] = None
        self._exit_stack = ExitStack()
        self._serial: Optional[str] = None
        self._streaming: bool = False

    def _with_reconnect(self, operation: Callable, *args: Any, **kwargs: Any) -> Any:
        delays = [0.2, 0.5, 1.0, 2.0, 5.0]
        attempts = 0
        while True:
            try:
                return operation(*args, **kwargs)
            except AppError as e:
                # Only retry on connection-like errors
                if e.code not in (ErrorCode.E_CAM_NOT_CONNECTED, ErrorCode.E_CAM_TIMEOUT, ErrorCode.E_CAM_CAPTURE_FAILED):
                    raise
                if attempts >= len(delays):
                    raise
                
                logger.warning(
                    f"Daheng operation failed. Reconnecting in {delays[attempts]}s "
                    f"[cid={self._correlation_id}]. Error: {e.message}"
                )
                time.sleep(delays[attempts])
                attempts += 1
                
                if self._serial:
                    try:
                        self.close()
                        self.open(self._serial)
                        if self._streaming:
                            self.start_stream()
                    except Exception:
                        pass
            except Exception:
                raise

    def list_devices(self) -> list[DeviceInfo]:
        return [
            DeviceInfo(
                serial=d.serial,
                model=d.model,
                vendor=d.vendor,
                interface=d.interface
            ) for d in enumerate_devices()
        ]

    def open(self, serial: str) -> None:
        self._serial = serial
        self._handle = self._exit_stack.enter_context(open_by_serial(serial))

    def close(self) -> None:
        self._exit_stack.close()
        self._handle = None
        self._streaming = False

    def start_stream(self) -> None:
        if not self._handle:
            raise AppError.for_file(
                file_path=__file__, code=ErrorCode.E_CAM_NOT_CONNECTED,
                message="Camera not opened", reason="start_stream"
            )
        self._streaming = True

    def stop_stream(self) -> None:
        self._streaming = False
        if self._handle:
            stop_stream(self._handle)

    def grab(self, timeout_ms: int) -> Frame:
        if not self._handle:
            raise AppError.for_file(
                file_path=__file__, code=ErrorCode.E_CAM_NOT_CONNECTED,
                message="Camera not opened", reason="grab"
            )
        env = self._with_reconnect(trigger_once, self._handle, timeout_ms)
        h, w = env.data.shape[:2] if hasattr(env.data, 'shape') else (0, 0)
        return Frame(
            data=env.data.tobytes() if hasattr(env.data, 'tobytes') else b'',
            width=w,
            height=h,
            pixel_format=PixelFormat.RGB8,
            timestamp_ns=env.ts_ns,
            frame_id=env.frame_id
        )

    def set_exposure(self, microseconds: int) -> None:
        if self._handle:
            self._with_reconnect(configure_exposure, self._handle, float(microseconds))

    def set_gain(self, decibels: float) -> None:
        if self._handle:
            self._with_reconnect(configure_gain, self._handle, decibels)

    def set_roi(self, roi: Roi) -> None:
        if self._handle:
            self._with_reconnect(configure_roi, self._handle, roi.x, roi.y, roi.width, roi.height)

    def set_pixel_format(self, fmt: PixelFormat) -> None:
        # Simplistic stub for format
        pass

    def set_trigger(
        self,
        mode: TriggerMode,
        source: TriggerSource = TriggerSource.SOFTWARE,
        activation: TriggerActivation = TriggerActivation.RISING_EDGE,
    ) -> None:
        if self._handle:
            if mode == TriggerMode.ON:
                self._with_reconnect(arm_trigger, self._handle, source.value, activation.value, 0.0)

    def execute_software_trigger(self) -> None:
        if self._handle:
            # We assume grab() calls trigger_once internally if software trigger is on
            pass

    def read_line_status(self, line: str) -> bool:
        if not self._handle:
            raise AppError.for_file(
                file_path=__file__, code=ErrorCode.E_CAM_NOT_CONNECTED,
                message="Camera not opened", reason="read_line_status"
            )
        return self._with_reconnect(read_line, self._handle, line)

    def set_line_output(self, line: str, on: bool) -> None:
        if self._handle:
            self._with_reconnect(write_line, self._handle, line, on)
