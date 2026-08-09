from contextlib import contextmanager
from typing import Any, Iterator, Optional, Callable
import time
import threading
import weakref
import atexit
import logging

logger = logging.getLogger(__name__)

_open_handles: weakref.WeakSet['DahengHandle'] = weakref.WeakSet()

def _cleanup_handles() -> None:
    for handle in list(_open_handles):
        if handle.device is not None:
            logger.warning("Resource leak: closing dangling Daheng handle")
            try:
                handle.close()
            except Exception:
                pass

atexit.register(_cleanup_handles)

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade.types import CameraDeviceInfo, FrameEnvelope
from .loader import load_gxipy
from .errors import map_gxipy_errors

class DahengHandle:
    def __init__(self, device: Any):
        self.device = device
        
    def close(self) -> None:
        if self.device:
            self.device.close_device()
            self.device = None


@map_gxipy_errors
def enumerate_devices() -> list[CameraDeviceInfo]:
    gxipy = load_gxipy()
    device_manager = gxipy.DeviceManager()
    dev_num, dev_info_list = device_manager.update_device_list()
    
    devices = []
    for info in dev_info_list:
        devices.append(
            CameraDeviceInfo(
                serial=info.get("sn", "Unknown"),
                model=info.get("model_name", "Unknown"),
                vendor=info.get("vendor_name", "Daheng"),
                interface=info.get("device_class", "Unknown"),
                ip_or_bus=info.get("ip", None),
                firmware=info.get("firmware_version", None)
            )
        )
    return devices


@contextmanager
@map_gxipy_errors
def open_by_serial(serial: str) -> Iterator[DahengHandle]:
    gxipy = load_gxipy()
    device_manager = gxipy.DeviceManager()
    
    try:
        # Open the device with strict timeout logic handled within SDK or wrapper
        device = device_manager.open_device_by_sn(serial)
    except Exception as e:
        raise AppError.for_file(
            file_path=__file__,
            code=ErrorCode.E_CAM_NOT_CONNECTED,
            message=f"Failed to open Daheng camera by serial {serial}",
            reason="open_device_by_sn failed",
            details={"serial": serial, "error": str(e)}
        ) from e
        
    handle = DahengHandle(device)
    _open_handles.add(handle)
    try:
        yield handle
    finally:
        handle.close()


@map_gxipy_errors
def read_feature(handle: DahengHandle, node: str) -> Any:
    if not handle.device:
        raise ValueError("Device handle is closed")
    
    # Generic attribute access. Could map to IntFeature, FloatFeature, etc.
    try:
        feature = getattr(handle.device, node)
        return feature.get()
    except Exception as e:
        raise AppError.for_file(
            file_path=__file__,
            code=ErrorCode.E_BE_BAD_REQUEST,
            message=f"Failed to read feature {node}",
            reason="read_feature failed",
            details={"node": node, "error": str(e)}
        ) from e


@map_gxipy_errors
def write_feature(handle: DahengHandle, node: str, value: Any) -> None:
    if not handle.device:
        raise ValueError("Device handle is closed")
        
    try:
        feature = getattr(handle.device, node)
        feature.set(value)
    except Exception as e:
        raise AppError.for_file(
            file_path=__file__,
            code=ErrorCode.E_BE_BAD_REQUEST,
            message=f"Failed to write feature {node}",
            reason="write_feature failed",
            details={"node": node, "value": value, "error": str(e)}
        ) from e


@map_gxipy_errors
def configure_roi(handle: DahengHandle, offset_x: int, offset_y: int, width: int, height: int) -> None:
    # Need to disable stream / ensure stopped before changing ROI in many SDKs, 
    # but primitive just sets values.
    # Order matters: reduce width/height first before moving offset, 
    # or reset offset to 0 before increasing width/height.
    write_feature(handle, "OffsetX", 0)
    write_feature(handle, "OffsetY", 0)
    write_feature(handle, "Width", width)
    write_feature(handle, "Height", height)
    write_feature(handle, "OffsetX", offset_x)
    write_feature(handle, "OffsetY", offset_y)


@map_gxipy_errors
def configure_exposure(handle: DahengHandle, exposure_us: float) -> None:
    write_feature(handle, "ExposureTime", exposure_us)


@map_gxipy_errors
def configure_gain(handle: DahengHandle, gain_db: float) -> None:
    write_feature(handle, "Gain", gain_db)


@map_gxipy_errors
def configure_white_balance(handle: DahengHandle, ratio_r: float, ratio_g: float, ratio_b: float) -> None:
    write_feature(handle, "BalanceRatioSelector", "Red")
    write_feature(handle, "BalanceRatio", ratio_r)
    write_feature(handle, "BalanceRatioSelector", "Green")
    write_feature(handle, "BalanceRatio", ratio_g)
    write_feature(handle, "BalanceRatioSelector", "Blue")
    write_feature(handle, "BalanceRatio", ratio_b)


@map_gxipy_errors
def start_stream(handle: DahengHandle, on_frame: Callable[[FrameEnvelope], None]) -> None:
    if not handle.device:
        raise ValueError("Device handle is closed")
    handle.device.stream_on()
    
    def _capture_thread() -> None:
        while handle.device:
            try:
                raw_image = handle.device.data_stream[0].get_image()
                if raw_image is None:
                    continue
                rgb_image = raw_image.convert("RGB")
                data = rgb_image.get_numpy_array()
                env = FrameEnvelope(
                    data=data,
                    ts_ns=time.time_ns(),
                    frame_id=raw_image.get_frame_id()
                )
                on_frame(env)
            except Exception:
                break
    
    t = threading.Thread(target=_capture_thread, daemon=True)
    t.start()


@map_gxipy_errors
def stop_stream(handle: DahengHandle) -> None:
    if not handle.device:
        return
    try:
        handle.device.stream_off()
    except Exception as e:
        handle.close()
        raise AppError.for_file(
            file_path=__file__,
            code=ErrorCode.E_CAM_STREAM_STUCK,
            message="Failed to stop Daheng stream gracefully",
            reason="stream_off failed",
            details={"error": str(e)}
        ) from e


@map_gxipy_errors
def trigger_once(handle: DahengHandle, timeout_ms: int = 1000) -> FrameEnvelope:
    if not handle.device:
        raise ValueError("Device handle is closed")
    try:
        write_feature(handle, "TriggerSoftware", 1)
        raw_image = handle.device.data_stream[0].get_image(timeout=timeout_ms)
        if raw_image is None:
            raise TimeoutError("Timeout waiting for image")
        rgb_image = raw_image.convert("RGB")
        data = rgb_image.get_numpy_array()
        return FrameEnvelope(
            data=data,
            ts_ns=time.time_ns(),
            frame_id=raw_image.get_frame_id()
        )
    except Exception as e:
        raise AppError.for_file(
            file_path=__file__,
            code=ErrorCode.E_CAM_CAPTURE_FAILED,
            message="Software trigger failed",
            reason="trigger_once timeout or error",
            details={"error": str(e)}
        ) from e


@map_gxipy_errors
def arm_trigger(handle: DahengHandle, source: str, activation: str, delay_us: float) -> None:
    write_feature(handle, "TriggerMode", "On")
    write_feature(handle, "TriggerSource", source)
    write_feature(handle, "TriggerActivation", activation)
    write_feature(handle, "TriggerDelay", delay_us)


@map_gxipy_errors
def read_line(handle: DahengHandle, line: str) -> bool:
    if not handle.device:
        raise ValueError("Device handle is closed")
    write_feature(handle, "LineSelector", line)
    return bool(getattr(handle.device, "LineStatus").get())


@map_gxipy_errors
def write_line(handle: DahengHandle, line: str, value: bool) -> None:
    if not handle.device:
        raise ValueError("Device handle is closed")
    write_feature(handle, "LineSelector", line)
    write_feature(handle, "UserOutputValue", value)
