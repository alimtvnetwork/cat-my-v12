"""In-memory `CameraFacade` implementation (Plan 88 Step 21).

Mirrors the Daheng MERCURY2 surface documented in `sdk/daheng-galaxy-sdk-manual.md`
§2 so FE work (device pickers, exposure/gain/ROI/trigger controls, opto I/O
diagnostics) can proceed before a physical camera is wired.

Rules (see `spec/21-app/40-error-manage.md` §3):
- No fabricated frame bytes. `grab()` raises `E_CAM_CAPTURE_FAILED` with
  message "not implemented" so callers cannot mistake the stub for real
  pixels. A future adapter overrides this.
- All validation errors raise `AppError(E_BE_BAD_REQUEST)` with the offending
  node name and the observed `Min/Max/Inc`, per manual §8.
- All lifecycle mistakes (grab-before-open, stream-before-open) raise
  `AppError(E_CAM_NOT_CONNECTED)`; timeouts on a would-be `grab()` raise
  `AppError(E_CAM_TIMEOUT)`.
- Vendor handles never leak: no `gxipy` / `GxIAPI` import here; state is a
  plain in-memory dict.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Final

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

# Deterministic stub roster. Serials are stable so FE fixtures / tests pin them.
_STUB_DEVICES: Final[tuple[DeviceInfo, ...]] = (
    DeviceInfo(serial="SN-STUB-0000", model="MER2-U3-STUB", vendor="Daheng", interface="U3V"),
    DeviceInfo(serial="SN-STUB-0001", model="MER2-U3-STUB", vendor="Daheng", interface="U3V"),
)
_KNOWN_SERIALS: Final[frozenset[str]] = frozenset(d.serial for d in _STUB_DEVICES)

# Sensor limits (manual §8, MER2-U3 defaults). Real adapter queries GenICam
# nodes at open time; the stub uses fixed clamps so validation is testable.
_EXPOSURE_MIN_US: Final[int] = 20
_EXPOSURE_MAX_US: Final[int] = 1_000_000
_GAIN_MIN_DB: Final[float] = 0.0
_GAIN_MAX_DB: Final[float] = 24.0
_ROI_INC: Final[int] = 4
_SENSOR_W: Final[int] = 1920
_SENSOR_H: Final[int] = 1200

# Opto-isolated I/O line names (manual §6). Resolved by LineSelector, never pin number.
_INPUT_LINES: Final[frozenset[str]] = frozenset({"Line0"})
_OUTPUT_LINES: Final[frozenset[str]] = frozenset({"Line1"})
_BIDIR_LINES: Final[frozenset[str]] = frozenset({"Line2", "Line3"})
_ALL_LINES: Final[frozenset[str]] = _INPUT_LINES | _OUTPUT_LINES | _BIDIR_LINES


@dataclass
class _State:
    open_serial: str | None = None
    streaming: bool = False
    exposure_us: int = 10_000
    gain_db: float = 0.0
    roi: Roi = field(default_factory=lambda: Roi(0, 0, _SENSOR_W, _SENSOR_H))
    pixel_format: PixelFormat = PixelFormat.MONO8
    trigger_mode: TriggerMode = TriggerMode.OFF
    trigger_source: TriggerSource = TriggerSource.SOFTWARE
    trigger_activation: TriggerActivation = TriggerActivation.RISING_EDGE
    line_outputs: dict[str, bool] = field(default_factory=dict)


class InMemoryCameraFacade:
    """Vendor-free `CameraFacade`. Satisfies the Protocol; refuses to fabricate pixels."""

    def __init__(self) -> None:
        self._s = _State()

    # ---------- enumeration & lifecycle ----------

    def list_devices(self) -> list[DeviceInfo]:
        return list(_STUB_DEVICES)

    def open(self, serial: str) -> None:
        if serial not in _KNOWN_SERIALS:
            raise AppError(
                ErrorCode.E_CAM_NOT_CONNECTED,
                f"unknown camera serial {serial!r} (known: {sorted(_KNOWN_SERIALS)})",
                {"serial": serial, "known": sorted(_KNOWN_SERIALS)},
            )
        if self._s.open_serial is not None and self._s.open_serial != serial:
            raise AppError(
                ErrorCode.E_BE_CONFLICT,
                f"another camera is already open (open_serial={self._s.open_serial!r}, requested={serial!r})",
                {"open_serial": self._s.open_serial, "requested": serial},
            )
        self._s.open_serial = serial

    def close(self) -> None:
        # Idempotent per manual §2: always safe to call in a `finally`.
        self._s.streaming = False
        self._s.open_serial = None

    # ---------- streaming & capture ----------

    def start_stream(self) -> None:
        self._require_open("start_stream")
        self._s.streaming = True

    def stop_stream(self) -> None:
        # Idempotent per manual §2.
        self._s.streaming = False

    def grab(self, timeout_ms: int) -> Frame:
        self._require_open("grab")
        if timeout_ms <= 0:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"parameter 'timeout_ms' must be > 0 (got {timeout_ms}) on serial={self._s.open_serial!r}",
                {"node": "timeout_ms", "value": timeout_ms, "min": 1, "serial": self._s.open_serial},
            )
        if not self._s.streaming:
            raise AppError(
                ErrorCode.E_CAM_NOT_CONNECTED,
                f"stream is not started on serial={self._s.open_serial!r}; call start_stream() first",
                {"open_serial": self._s.open_serial},
            )
        # No fabricated frames. The stub cannot produce pixels; surface it loudly.
        raise AppError(
            ErrorCode.E_CAM_CAPTURE_FAILED,
            f"grab not implemented on in-memory stub (serial={self._s.open_serial!r}, pixel_format={self._s.pixel_format.value})",
            {
                "adapter": "InMemoryCameraFacade",
                "serial": self._s.open_serial,
                "pixel_format": self._s.pixel_format.value,
            },
        )

    # ---------- sensor config ----------

    def set_exposure(self, microseconds: int) -> None:
        self._require_open("set_exposure")
        self._require_range("ExposureTime", microseconds, _EXPOSURE_MIN_US, _EXPOSURE_MAX_US, 1)
        self._s.exposure_us = int(microseconds)

    def set_gain(self, decibels: float) -> None:
        self._require_open("set_gain")
        if not (_GAIN_MIN_DB <= decibels <= _GAIN_MAX_DB):
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'Gain' out of range on serial={self._s.open_serial!r} (value={decibels}, min={_GAIN_MIN_DB}, max={_GAIN_MAX_DB})",
                {"node": "Gain", "value": decibels, "min": _GAIN_MIN_DB, "max": _GAIN_MAX_DB, "serial": self._s.open_serial},
            )
        self._s.gain_db = float(decibels)

    def set_roi(self, roi: Roi) -> None:
        self._require_open("set_roi")
        for name, value in (("OffsetX", roi.x), ("OffsetY", roi.y), ("Width", roi.width), ("Height", roi.height)):
            if value < 0 or value % _ROI_INC != 0:
                raise AppError(
                    ErrorCode.E_BE_BAD_REQUEST,
                    f"node {name!r} must be a non-negative multiple of {_ROI_INC} on serial={self._s.open_serial!r} (value={value})",
                    {"node": name, "value": value, "inc": _ROI_INC, "serial": self._s.open_serial},
                )
        if roi.x + roi.width > _SENSOR_W or roi.y + roi.height > _SENSOR_H:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'ROI' exceeds sensor bounds on serial={self._s.open_serial!r} (roi={[roi.x, roi.y, roi.width, roi.height]}, sensor={[_SENSOR_W, _SENSOR_H]})",
                {"node": "ROI", "sensor": [_SENSOR_W, _SENSOR_H], "roi": [roi.x, roi.y, roi.width, roi.height], "serial": self._s.open_serial},
            )
        self._s.roi = roi

    def set_pixel_format(self, fmt: PixelFormat) -> None:
        self._require_open("set_pixel_format")
        if not isinstance(fmt, PixelFormat):
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'PixelFormat' must be a PixelFormat enum on serial={self._s.open_serial!r} (value={fmt!r})",
                {"node": "PixelFormat", "value": repr(fmt), "serial": self._s.open_serial},
            )
        self._s.pixel_format = fmt

    # ---------- trigger model ----------

    def set_trigger(
        self,
        mode: TriggerMode,
        source: TriggerSource = TriggerSource.SOFTWARE,
        activation: TriggerActivation = TriggerActivation.RISING_EDGE,
    ) -> None:
        self._require_open("set_trigger")
        self._s.trigger_mode = mode
        self._s.trigger_source = source
        self._s.trigger_activation = activation

    def execute_software_trigger(self) -> None:
        self._require_open("execute_software_trigger")
        if self._s.trigger_mode != TriggerMode.ON or self._s.trigger_source != TriggerSource.SOFTWARE:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'TriggerSoftware' requires TriggerMode=ON and TriggerSource=SOFTWARE on serial={self._s.open_serial!r} (mode={self._s.trigger_mode.value}, source={self._s.trigger_source.value})",
                {
                    "node": "TriggerSoftware",
                    "trigger_mode": self._s.trigger_mode.value,
                    "trigger_source": self._s.trigger_source.value,
                    "serial": self._s.open_serial,
                },
            )
        # Stub: no frame is produced. Real adapter would enqueue one.

    # ---------- opto-isolated I/O ----------

    def read_line_status(self, line: str) -> bool:
        self._require_open("read_line_status")
        self._require_line(line)
        # Stub: inputs read low; bidir/output reads back last written value or False.
        if line in _INPUT_LINES:
            return False
        return bool(self._s.line_outputs.get(line, False))

    def set_line_output(self, line: str, on: bool) -> None:
        self._require_open("set_line_output")
        self._require_line(line)
        if line in _INPUT_LINES:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'LineSelector' line={line!r} is input-only on serial={self._s.open_serial!r}",
                {"node": "LineSelector", "line": line, "direction": "input", "serial": self._s.open_serial},
            )
        self._s.line_outputs[line] = bool(on)

    # ---------- helpers ----------

    def _require_open(self, op: str) -> None:
        if self._s.open_serial is None:
            raise AppError(
                ErrorCode.E_CAM_NOT_CONNECTED,
                f"{op} called before open() (no serial bound)",
                {"op": op, "serial": None},
            )

    def _require_range(self, node: str, value: Any, lo: Any, hi: Any, inc: Any) -> None:
        if not (lo <= value <= hi):
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node {node!r} out of range on serial={self._s.open_serial!r} (value={value}, min={lo}, max={hi}, inc={inc})",
                {"node": node, "value": value, "min": lo, "max": hi, "inc": inc, "serial": self._s.open_serial},
            )

    def _require_line(self, line: str) -> None:
        if line not in _ALL_LINES:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"node 'LineSelector' unknown line={line!r} on serial={self._s.open_serial!r} (known: {sorted(_ALL_LINES)})",
                {"node": "LineSelector", "line": line, "known": sorted(_ALL_LINES), "serial": self._s.open_serial},
            )



# Contract self-check at import: fail fast if we drift from the Protocol.
assert isinstance(InMemoryCameraFacade(), CameraFacade), "InMemoryCameraFacade drifted from CameraFacade Protocol"


__all__ = ["InMemoryCameraFacade"]
